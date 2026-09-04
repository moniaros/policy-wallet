import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import { ProtectionMapCard } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import { getTranslations } from "@/lib/i18n"
import { mapRowCounts, mapRowsFrom, movedRows } from "@/lib/onboarding/protection-profile/map-rows"
import { buildAttentionAreas, type AttentionAreaView, type AttentionNeeds } from "@/lib/protection/attention-areas"
import { buildCoverageModel, type PolicyEvidenceInput } from "@/lib/protection/coverage-model"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks, type HeldPolicy } from "@/lib/services/gap-engine/risk-assessment"
import {
    deriveProtectionPriorities,
    type ProtectionPriority,
    type ProtectionStatementsLike,
} from "@/lib/services/protection-profile/derive-priorities"

/**
 * The protection map — «Η εικόνα σου μέχρι τώρα» — rendered from the
 * attention areas the loader composes. Every fixture goes through the real
 * composition (facts → exposure → protection → alignment), so what the
 * card may say is asserted against what the evidence actually supports:
 * no score, no percentage, no coverage word without a policy in force, no
 * formal-register sentence inside the onboarding's singular voice.
 */

const labels = getTranslations("el").onboarding.protectionProfile.summary
const mapLabels = getTranslations("el").onboarding.protectionProfile.map

interface World {
    profile: Record<string, unknown>
    policies?: PolicyEvidenceInput[]
    statements?: ProtectionStatementsLike | null
    needs?: AttentionNeeds
}

function compose(w: World): { priorities: ProtectionPriority[]; areas: AttentionAreaView[] } {
    const ctx = toLifeContext(w.profile as any)
    const policies = w.policies ?? []
    const held: HeldPolicy[] = policies
        .filter((p) => p.lifecycle === "active" || p.lifecycle === "expiring_soon")
        .map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: "active" }))
    const priorities = deriveProtectionPriorities(ctx, w.statements ?? null)
    const areas = buildAttentionAreas({
        priorities,
        assessments: assessRisks(ctx, held),
        coverage: buildCoverageModel(policies),
        provenance: {},
        ctx,
        needs: { riskConcerns: (w.statements?.riskConcerns as string[] | undefined) ?? [], ...(w.needs ?? {}) },
        language: "el",
    })
    return { priorities, areas }
}

/** Two people live on this income, which is «κυρίως» theirs; income named first; loans unsettled. */
const FAMILY = {
    childrenCount: 1,
    dependentsCount: 2,
    employmentStatus: "employed",
    incomeDependency: "primary",
    answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "incomeDependency"],
}
const FAMILY_SAID: ProtectionStatementsLike = { riskConcerns: ["income"], unsureSteps: ["obligations"] }

const lifePolicy = (over: Partial<PolicyEvidenceInput> = {}): PolicyEvidenceInput => ({
    id: "life-1",
    lineOfBusiness: "life",
    lifecycle: "active",
    detail: "summary_only",
    gaps: [],
    ...over,
})
const RULE_GAP = {
    id: "g1",
    ruleId: "life_sum_below_income_years",
    slug: "life-sum-below-need",
    severity: "high",
    title: { el: "Ασφαλισμένο κεφάλαιο μικρότερο από την ανάγκη", en: "Sum insured below the need" },
}

const FORMAL = /(?<![\p{L}])(σας|εσάς|εσείς)(?![\p{L}])/u
const COVERED = /καλύπτεται/

function draw(w: World, over: Partial<React.ComponentProps<typeof ProtectionMapCard>> = {}) {
    const { priorities, areas } = compose(w)
    const utils = render(
        <ProtectionMapCard labels={labels} mapLabels={mapLabels} language="el" areas={areas} priorities={priorities} insight={null} confidence="gaps" unsureCount={1} countedTotal={10} {...over} />
    )
    return { ...utils, priorities, areas, text: utils.container.textContent ?? "" }
}

describe("ProtectionMapCard — the protection map, from the attention areas", () => {
    it("names the areas, the importance word and what we still do not know — never a score, a verdict without evidence, or the formal register", () => {
        const { container, text, areas, priorities } = draw({ profile: FAMILY, statements: FAMILY_SAID })
        const rows = mapRowsFrom(areas, priorities)
        expect(rows.map((r) => r.area)).toEqual(expect.arrayContaining(["household", "income", "debt", "mobility"]))

        expect(text).toContain("Εισόδημα")
        expect(text).toContain("Οικογένεια")
        expect(text).toContain(labels.importance.high)
        expect(text).toContain(labels.importance.needs_review)
        // The triplet in the singular, from structured fields.
        expect(text).toContain(mapLabels.alignment.not_yet_checked)
        expect(text).toContain(mapLabels.alignment.unknown)
        expect(text).toContain("Δεν ξέρουμε ακόμη: το εισόδημά σου")
        expect(text).toContain("την ηλικία σου")
        expect(text).toContain(mapLabels.confidence.inferred)
        expect(text).toContain(labels.disclaimer)
        expect(text).toContain(labels.confidence.gaps)

        // Nothing is held, so nothing may read as covered — on any row.
        expect(text).not.toMatch(COVERED)
        expect(container.querySelector('[data-count="attention.coveredCount"]')).toBeNull()
        // No score, no percentage, no accusation.
        expect(text).not.toMatch(/\d\s?%/)
        expect(text).not.toMatch(/σκορ|score|βαθμ|καλύπτεσαι|ανασφάλιστ/i)
        // The formal explanation /protection renders is never read here.
        for (const a of areas) {
            expect(text).not.toContain(a.explanation.why)
            expect(text).not.toContain(a.explanation.unknown)
            expect(text).not.toContain(a.explanation.next)
        }
        expect(text).not.toMatch(FORMAL)

        // The closing caveat — once, next to the disclaimer.
        expect(text.split(mapLabels.absenceCaveat).length - 1).toBe(1)

        // The fact cells: one key, one value — the numbers are the rendered rows'.
        // The head's «{n} σημεία» and the footer's «{n} περιοχές» carry the
        // same key and the same number: the rows between them.
        const counts = mapRowCounts(rows)
        expect(container.querySelectorAll("li[data-alignment]")).toHaveLength(counts.areaCount)
        const areaCells = Array.from(container.querySelectorAll('[data-count="attention.areaCount"]'))
        expect(areaCells).toHaveLength(2)
        for (const cell of areaCells) expect(cell.textContent).toContain(String(counts.areaCount))
        expect(text).toContain(labels.countMeta.replace("{n}", String(counts.areaCount)))
        expect(counts.unknownCount).toBeGreaterThan(0)
        expect(container.querySelector('[data-count="attention.unknownCount"]')?.textContent).toContain(String(counts.unknownCount))
        // The headline counts the named priorities, uncapped — never «3» over a longer list.
        const named = priorities.filter((p) => p.importance === "high" || p.importance === "medium")
        expect(named.length).toBeLessThanOrEqual(counts.areaCount)
        expect(text).toContain(named.length === 1 ? labels.leadOne : labels.lead.replace("{n}", String(named.length)))
        expect(text).toContain(labels.unsureCountOne)
        expect(container.querySelector('[data-count="needs.unsureCount"]')?.textContent).toContain("1")
        expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
    })

    it("the headline never caps the named priorities at three while the list shows more", () => {
        // Six things named: income, family, home, loan, vehicle, health — a
        // «{3} πράγματα» headline over six rows was the contradiction.
        const profile = { ...FAMILY, residenceType: "owned", ownsHome: true, vehiclesCount: 1, hasLoans: true, answeredFields: [...FAMILY.answeredFields, "residenceType", "ownsHome", "vehiclesCount", "hasLoans"] }
        const said: ProtectionStatementsLike = { riskConcerns: ["income", "family"], recentChanges: ["bought_home", "new_vehicle", "health_changed"], commitments: ["mortgage"], unsureSteps: [] }
        const { text, priorities, areas, container } = draw({ profile, statements: said }, { unsureCount: 0 })
        const named = priorities.filter((p) => p.importance === "high" || p.importance === "medium")
        expect(named.length).toBeGreaterThan(3)
        expect(text).toContain(labels.lead.replace("{n}", String(named.length)))
        expect(text).not.toContain(labels.lead.replace("{n}", "3"))
        const rows = mapRowsFrom(areas, priorities)
        expect(text).toContain(labels.countMeta.replace("{n}", String(rows.length)))
        expect(container.querySelectorAll("li[data-alignment]")).toHaveLength(rows.length)
        // Two, not one: pluralised for more than one open point.
        const two = draw({ profile, statements: said }, { unsureCount: 2 })
        expect(two.text).toContain(labels.unsureCount.replace("{n}", "2"))
        expect(two.text).not.toContain(labels.unsureCountOne)
    })

    it("«φαίνεται να καλύπτεται» appears only on a row with a policy in force behind it — and says the limits were not read", () => {
        const { container, text, areas, priorities } = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy()] })
        const rows = mapRowsFrom(areas, priorities)
        const household = rows.find((r) => r.area === "household")!
        expect(household.alignment).toBe("appears_covered")
        expect(household.heldLine).toBe(true)
        expect(household.limitsUnread).toBe(true)
        expect(text).toContain(`${mapLabels.alignment.appears_covered} — ${mapLabels.limitsUnread}`)
        expect(container.querySelector('[data-count="attention.coveredCount"]')?.textContent).toContain("1")

        // Row by row: the word lives only where the evidence does.
        for (const li of Array.from(container.querySelectorAll<HTMLElement>("li[data-alignment]"))) {
            const alignment = li.getAttribute("data-alignment")
            const row = rows.find((r) => r.alignment === alignment && (li.textContent ?? "").includes(mapLabels.alignment[r.alignment as keyof typeof mapLabels.alignment] ?? ""))
            if (alignment === "appears_covered") {
                expect(row?.heldLine, li.textContent ?? "").toBe(true)
                expect(li.textContent).toMatch(COVERED)
            } else {
                expect(li.textContent, li.textContent ?? "").not.toMatch(COVERED)
            }
        }
        // With the limits read, the caveat goes.
        const read = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy({ detail: "analysed", coverages: [{ name: "Death benefit", limit: 100000 }] })] })
        expect(read.text).toContain(mapLabels.alignment.appears_covered)
        expect(read.text).not.toContain(mapLabels.limitsUnread)
    })

    it("a rule-decided finding speaks with its own title; an expired policy answers nothing — and the row says it lapsed", () => {
        const gap = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy({ gaps: [RULE_GAP] })] })
        expect(gap.areas.find((a) => a.area === "household")?.alignment).toBe("gap")
        expect(gap.text).toContain(RULE_GAP.title.el)
        expect(gap.container.querySelector('li[data-alignment="gap"]')).toBeTruthy()

        const lapsed = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy({ lifecycle: "expired", gaps: [RULE_GAP] })] })
        expect(lapsed.text).not.toMatch(COVERED)
        expect(lapsed.text).not.toContain(RULE_GAP.title.el)
        expect(lapsed.container.querySelector('[data-count="attention.coveredCount"]')).toBeNull()
        // «Έχει λήξει», in the singular, from the composition's `lapsedOnly` —
        // under the row whose only policy seen has ended, and nowhere else.
        const rows = mapRowsFrom(lapsed.areas, lapsed.priorities)
        const household = rows.find((r) => r.area === "household")!
        expect(household.lapsedOnly).toBe(true)
        expect(household.heldLine).toBe(false)
        const caveats = Array.from(lapsed.container.querySelectorAll('[data-caveat="lapsed"]'))
        expect(caveats).toHaveLength(rows.filter((r) => r.lapsedOnly && !r.heldLine).length)
        expect(caveats[0]?.textContent).toBe(mapLabels.lapsedOnly)
        expect(caveats[0]?.closest("li")?.textContent).toContain(mapLabels.alignment.not_yet_checked)
        expect(mapLabels.lapsedOnly).not.toMatch(FORMAL)
        expect(draw({ profile: FAMILY, statements: FAMILY_SAID }).container.querySelector('[data-caveat="lapsed"]')).toBeNull()
    })

    it("«λήγει σύντομα» rides on the composition's `expiringSoon`, and a change of liveness counts as something that moved", () => {
        const expiring = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy({ lifecycle: "expiring_soon" })] })
        const row = mapRowsFrom(expiring.areas, expiring.priorities).find((r) => r.area === "household")!
        expect(row.alignment).toBe("appears_covered")
        expect(row.expiringSoon).toBe(true)
        expect(expiring.container.querySelector('li[data-alignment="appears_covered"]')?.textContent).toContain(
            `${mapLabels.alignment.appears_covered} — ${mapLabels.limitsUnread}, ${mapLabels.expiringSoon}`
        )
        expect(mapLabels.expiringSoon).not.toMatch(FORMAL)
        const active = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy()] })
        expect(active.text).not.toContain(mapLabels.expiringSoon)
        const moved = movedRows(mapRowsFrom(active.areas, active.priorities), mapRowsFrom(expiring.areas, expiring.priorities))
        expect(moved.map((m) => m.area)).toEqual(["household"])
    })

    it("the map's caveats come from the view's fields — never re-derived from lines, never matched out of a sentence", () => {
        const src = readFileSync("lib/onboarding/protection-profile/map-rows.ts", "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
        expect(src).toMatch(/limitsUnread: area\.limitsUnread/)
        expect(src).toMatch(/expiringSoon: area\.expiringSoon/)
        expect(src).toMatch(/lapsedOnly: area\.lapsedOnly/)
        expect(src).not.toMatch(/hasAnalysed/)
        expect(src).not.toMatch(/explanation\.(why|unknown|next)\b/)
        const card = readFileSync("components/onboarding/protection-profile/ProtectionMapCard.tsx", "utf-8")
        expect(card).not.toMatch(/explanation\.(why|unknown|next)\b/)
        expect(card).not.toMatch(/lifecycle\s*===/)
    })

    it("guidance decides how much coaching is OPEN, never whether it exists: the why folds behind a disclosure, the next step is always in view", () => {
        const why = "Είπες ότι άλλοι βασίζονται στο εισόδημά σου."
        const expanded = draw({ profile: FAMILY, statements: FAMILY_SAID, needs: { guidancePreference: "explain_everything" } })
        expect(expanded.text).toContain(why)
        expect(expanded.text).toContain(mapLabels.next.check_first_policy)
        expect(expanded.container.querySelector("details")).toBeNull()

        for (const guidancePreference of ["just_what_matters", "on_my_own"] as const) {
            const { container, text } = draw({ profile: FAMILY, statements: FAMILY_SAID, needs: { guidancePreference } })
            // The why is there, behind «Γιατί το βλέπεις» — «on my own» is not «tell me nothing».
            expect(container.querySelector("details"), guidancePreference).toBeTruthy()
            expect(container.querySelector("details summary")?.textContent, guidancePreference).toBe(mapLabels.whyLabel)
            expect(container.querySelector("details")?.textContent, guidancePreference).toContain(why)
            // The next step never hides: one visible line per row, outside any disclosure.
            const rows = Array.from(container.querySelectorAll("li[data-alignment]"))
            expect(rows.length).toBeGreaterThan(0)
            for (const li of rows) {
                const next = li.querySelector("[data-next-step]")
                expect(next, guidancePreference).toBeTruthy()
                expect(next?.closest("details"), guidancePreference).toBeNull()
                expect(Object.values(mapLabels.next)).toContain(next?.textContent?.replace(`${mapLabels.nextLabel}: `, ""))
            }
            // The facts stay whatever the density: the alignment, the unknowns, the confidence.
            expect(text).toContain(mapLabels.alignment.not_yet_checked)
            expect(text).toContain("Δεν ξέρουμε ακόμη: το εισόδημά σου")
            expect(text).toContain(mapLabels.confidence.inferred)
        }
    })

    it("after the first upload the map says what moved — or, when the reading only queued, that nothing has yet", () => {
        const before = compose({ profile: FAMILY, statements: FAMILY_SAID })
        const after = compose({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy()] })
        const moved = movedRows(mapRowsFrom(before.areas, before.priorities), mapRowsFrom(after.areas, after.priorities))
        expect(moved.map((m) => m.area)).toEqual(["household"])
        expect(moved[0].before?.alignment).toBe("not_yet_checked")
        expect(moved[0].after.alignment).toBe("appears_covered")
        expect(moved[0].after.limitsUnread).toBe(true)

        const read = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy()] }, { afterUpload: { read: true, moved } })
        const strip = read.container.querySelector("[data-after-upload]")!
        expect(strip.getAttribute("data-after-upload")).toBe("read")
        expect(strip.textContent).toContain(labels.afterUpload.title)
        // «Οικογένεια: [Πριν:] Δεν έχουμε δει ακόμη ασφαλιστήριο → [Τώρα:] Φαίνεται να καλύπτεται — τα όρια δεν έχουν διαβαστεί ακόμη»
        expect(strip.textContent).toContain(`${labels.domainLabel.household}: `)
        expect(strip.textContent).toContain(`${labels.afterUpload.beforeLabel}: ${mapLabels.alignment.not_yet_checked}`)
        expect(strip.textContent).toContain(`${labels.afterUpload.afterLabel}: ${mapLabels.alignment.appears_covered} — ${mapLabels.limitsUnread}`)
        expect(strip.querySelector('[data-moved="household"]')).toBeTruthy()
        expect(read.text).not.toContain(labels.afterUpload.nothingYet)
        expect(read.text).not.toContain(labels.afterUpload.readNoChange)
        expect(read.text).not.toMatch(FORMAL)

        // Queued: the picture has not changed, and the line says so — never «έτοιμη».
        const queued = draw({ profile: FAMILY, statements: FAMILY_SAID }, { afterUpload: { read: false, moved: [] } })
        expect(queued.container.querySelector("[data-after-upload]")?.getAttribute("data-after-upload")).toBe("queued")
        expect(queued.text).toContain(labels.afterUpload.nothingYet)
        expect(queued.text).not.toMatch(/έτοιμ/i)
        expect(queued.container.querySelector("[data-moved]")).toBeNull()

        // Read, nothing among the rows moved: said as such, not as «ready».
        const still = draw({ profile: FAMILY, statements: FAMILY_SAID }, { afterUpload: { read: true, moved: [] } })
        expect(still.text).toContain(labels.afterUpload.readNoChange)
        expect(still.text).not.toMatch(/έτοιμ/i)

        // No strip on the first visit.
        expect(draw({ profile: FAMILY, statements: FAMILY_SAID }).container.querySelector("[data-after-upload]")).toBeNull()
        // Identical maps move nothing.
        expect(movedRows(mapRowsFrom(after.areas, after.priorities), mapRowsFrom(after.areas, after.priorities))).toEqual([])
    })

    it("with nothing standing out it says so instead of inventing a priority", () => {
        const { container, text } = draw({ profile: {}, statements: null }, { confidence: null, unsureCount: 0 })
        expect(text).toContain(labels.leadNone)
        expect(text).toContain(labels.notAskedYet)
        expect(text).not.toMatch(COVERED)
        expect(text).not.toMatch(FORMAL)
        // Only the areas a fact could not settle are listed — nothing dormant.
        for (const li of Array.from(container.querySelectorAll("li[data-alignment]"))) expect(li.getAttribute("data-alignment")).toBe("unknown")
        expect(container.querySelector('[data-count="needs.unsureCount"]')).toBeNull()
    })
})
