import { describe, expect, it } from "vitest"
import { deriveProtectionPriorities, topPriorityIds } from "@/lib/services/protection-profile/derive-priorities"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"

const ctxOf = (profile: Record<string, unknown>) => toLifeContext(profile as any)

describe("deriveProtectionPriorities — the protection map rules", () => {
    it("the brief's example row: income is high, at low confidence, needing review", () => {
        const ctx = ctxOf({
            childrenCount: 2, dependentsCount: 3, employmentStatus: "employed",
            answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"],
        })
        const rows = deriveProtectionPriorities(ctx, { riskConcerns: ["income"] })
        const income = rows.find((r) => r.id === "money:income")!
        expect(income.importance).toBe("high")
        expect(income.confidence).toBe("partial") // employment known, income amount never asked
        expect(income.requiresValidation).toBe(true)
        expect(income.status).toBe("needs_review")
        expect(income.reason.id).toBe("stated_primary")
    })

    it("an unsettled fact is «χρειάζονται περισσότερα στοιχεία», never a finding", () => {
        const rows = deriveProtectionPriorities(ctxOf({}), { unsureSteps: ["people", "obligations"] })
        expect(rows.find((r) => r.id === "household")?.importance).toBe("needs_review")
        expect(rows.find((r) => r.id === "money:debt")?.importance).toBe("needs_review")
    })

    it("nothing said and nothing known yields only the areas everyone has", () => {
        const rows = deriveProtectionPriorities(ctxOf({}), null)
        // Health and home apply to everyone; income/work/mobility are unknown
        // (needs_review); nothing is hidden by a fact we never learned.
        expect(rows.map((r) => r.id)).toEqual(
            expect.arrayContaining(["health", "residence", "money:income", "mobility", "work"])
        )
        expect(rows.every((r) => r.requiresValidation)).toBe(true)
    })

    it("a mentioned area that does not apply today is kept as watch, not hidden", () => {
        const ctx = ctxOf({ vehiclesCount: 0, answeredFields: ["vehiclesCount"] })
        const rows = deriveProtectionPriorities(ctx, { riskConcerns: ["vehicle"] })
        const mobility = rows.find((r) => r.id === "mobility")!
        expect(mobility.importance).toBe("watch")
        expect(mobility.reason.id).toBe("mentioned_not_present")
        // And with no mention it is not shown at all.
        expect(deriveProtectionPriorities(ctx, null).find((r) => r.id === "mobility")).toBeUndefined()
    })

    it("a recent change lifts the area to high; a plan to medium", () => {
        const ctx = ctxOf({ residenceType: "owned", ownsHome: true, propertiesOwned: 1, answeredFields: ["residenceType", "ownsHome", "propertiesOwned"] })
        const changed = deriveProtectionPriorities(ctx, { recentChanges: ["bought_home"] })
        expect(changed.find((r) => r.id === "residence")?.importance).toBe("high")
        expect(changed.find((r) => r.id === "residence")?.reason.id).toBe("changed_recently")
        const planned = deriveProtectionPriorities(ctx, { futureConsiderations: ["retirement"] })
        expect(planned.find((r) => r.id === "money:retirement")?.importance).toBe("medium")
    })

    it("§E: «πόσο βασίζεται το νοικοκυριό σου στο εισόδημά σου;» is a floor on the household and income rows", () => {
        const family = {
            childrenCount: 1, dependentsCount: 2, employmentStatus: "employed",
            answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "incomeDependency"],
        }
        const rowsOf = (over: Record<string, unknown>, statements: Parameters<typeof deriveProtectionPriorities>[1] = null) =>
            deriveProtectionPriorities(ctxOf({ ...family, ...over }), statements)
        const importanceOf = (rows: ReturnType<typeof deriveProtectionPriorities>, id: string) => rows.find((r) => r.id === id)?.importance
        const reasonOf = (rows: ReturnType<typeof deriveProtectionPriorities>, id: string) => rows.find((r) => r.id === id)?.reason.id

        // Without the answer: dependants make both rows essential → medium.
        const none = rowsOf({})
        expect(importanceOf(none, "household")).toBe("medium")
        expect(importanceOf(none, "money:income")).toBe("medium")

        // «Κυρίως σε αυτό» with any dependant → both at least high, and the reason says so.
        const primary = rowsOf({ incomeDependency: "primary" })
        expect(importanceOf(primary, "household")).toBe("high")
        expect(importanceOf(primary, "money:income")).toBe("high")
        expect(reasonOf(primary, "household")).toBe("income_dependency")
        expect(reasonOf(primary, "money:income")).toBe("income_dependency")
        expect(primary.find((r) => r.id === "household")?.source).toBe("declared_fact")

        // «Περίπου στο μισό» → at least medium (already medium here: unchanged, reason kept).
        const shared = rowsOf({ incomeDependency: "shared" })
        expect(importanceOf(shared, "household")).toBe("medium")
        expect(importanceOf(shared, "money:income")).toBe("medium")
        expect(reasonOf(shared, "household")).toBe("dependants")
        expect(reasonOf(shared, "money:income")).toBe("income_dependency")

        // «Λίγο» → no change at all.
        expect(rowsOf({ incomeDependency: "minor" })).toEqual(none)

        // A floor never lowers: a stated primary concern keeps its own reason at high.
        const stated = rowsOf({ incomeDependency: "shared" }, { riskConcerns: ["family"] })
        expect(importanceOf(stated, "household")).toBe("high")
        expect(reasonOf(stated, "household")).toBe("stated_primary")
        // …and a stated area lifted by the fact keeps both sources.
        const both = rowsOf({ incomeDependency: "primary" }, { riskConcerns: ["home", "family"] })
        expect(importanceOf(both, "household")).toBe("high")
        expect(reasonOf(both, "household")).toBe("income_dependency")
        expect(both.find((r) => r.id === "household")?.source).toBe("both")

        // No dependant → the answer speaks about nobody: no floor.
        const alone = deriveProtectionPriorities(
            ctxOf({ childrenCount: 0, dependentsCount: 0, employmentStatus: "employed", incomeDependency: "primary", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "incomeDependency"] }),
            null
        )
        expect(alone.find((r) => r.id === "household")).toBeUndefined()
        expect(importanceOf(alone, "money:income")).toBe("watch")

        // A row a fact could not settle is not lifted out of «χρειάζονται περισσότερα στοιχεία»…
        const unsettled = deriveProtectionPriorities(
            ctxOf({ childrenCount: 1, dependentsCount: 2, incomeDependency: "primary", answeredFields: ["childrenCount", "dependentsCount", "incomeDependency"] }),
            null
        )
        expect(importanceOf(unsettled, "money:income")).toBe("needs_review")
        expect(importanceOf(unsettled, "household")).toBe("high")
        // …and an income row that is absent (a retiree) is not conjured up.
        const retired = rowsOf({ employmentStatus: "retired", incomeDependency: "primary" })
        expect(retired.find((r) => r.id === "money:income")).toBeUndefined()
        expect(importanceOf(retired, "household")).toBe("high")

        // The floor touches nothing else.
        for (const id of ["health", "residence", "money:debt", "mobility", "work", "money:retirement", "property"]) {
            expect(importanceOf(primary, id), id).toBe(importanceOf(none, id))
        }
    })

    it("never emits a coverage word or a score, and never reads a health column", () => {
        const base = { childrenCount: 1, dependentsCount: 1, employmentStatus: "employed", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"] }
        const without = deriveProtectionPriorities(ctxOf(base), { riskConcerns: ["health"] })
        const withHealth = deriveProtectionPriorities(
            ctxOf({ ...base, chronicConditions: ["diabetes"], answeredFields: [...base.answeredFields, "chronicConditions"] }),
            { riskConcerns: ["health"] }
        )
        expect(withHealth).toEqual(without)
        const allowed = new Set(["high", "medium", "watch", "needs_review"])
        for (const row of without) {
            expect(allowed.has(row.importance)).toBe(true)
            expect(JSON.stringify(row)).not.toMatch(/protected|unprotected|covered|score|βαθμ|σκορ|κάλυψη λείπει/i)
        }
        expect(without.find((r) => r.id === "health")?.importance).toBe("high")
        expect(without.find((r) => r.id === "health")?.status).toBe("unverified")
    })

    it("orders high → medium → watch → needs_review, the person's own concern order first, and is stable", () => {
        const ctx = ctxOf({
            childrenCount: 1, dependentsCount: 1, employmentStatus: "self_employed", residenceType: "rented", vehiclesCount: 1,
            answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "residenceType", "vehiclesCount"],
        })
        const a = deriveProtectionPriorities(ctx, { riskConcerns: ["home", "business"], unsureSteps: ["obligations"] })
        const b = deriveProtectionPriorities(ctx, { riskConcerns: ["home", "business"], unsureSteps: ["obligations"] })
        expect(a).toEqual(b)
        expect(a[0].id).toBe("residence")
        expect(a[1].id).toBe("work")
        const order = a.map((r) => ["high", "medium", "watch", "needs_review"].indexOf(r.importance))
        expect([...order].sort((x, y) => x - y)).toEqual(order)
        expect(a[a.length - 1].importance).toBe("needs_review")
        expect(topPriorityIds(a)).toEqual(a.filter((r) => r.importance !== "watch" && r.importance !== "needs_review").slice(0, 3).map((r) => r.id))
    })
})
