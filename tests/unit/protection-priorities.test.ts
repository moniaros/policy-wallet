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
