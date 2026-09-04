import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { ProtectionMapCard } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import { getTranslations } from "@/lib/i18n"
import { mapRowCounts, mapRowsFrom } from "@/lib/onboarding/protection-profile/map-rows"
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
        const counts = mapRowCounts(rows)
        expect(container.querySelectorAll("li[data-alignment]")).toHaveLength(counts.areaCount)
        expect(container.querySelector('[data-count="attention.areaCount"]')?.textContent).toContain(String(counts.areaCount))
        expect(counts.unknownCount).toBeGreaterThan(0)
        expect(container.querySelector('[data-count="attention.unknownCount"]')?.textContent).toContain(String(counts.unknownCount))
        expect(container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toContain(String(priorities.filter((p) => p.importance !== "watch").length))
        expect(container.querySelector('[data-count="needs.unsureCount"]')?.textContent).toContain("1")
        expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
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

    it("a rule-decided finding speaks with its own title; an expired policy answers nothing", () => {
        const gap = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy({ gaps: [RULE_GAP] })] })
        expect(gap.areas.find((a) => a.area === "household")?.alignment).toBe("gap")
        expect(gap.text).toContain(RULE_GAP.title.el)
        expect(gap.container.querySelector('li[data-alignment="gap"]')).toBeTruthy()

        const lapsed = draw({ profile: FAMILY, statements: FAMILY_SAID, policies: [lifePolicy({ lifecycle: "expired", gaps: [RULE_GAP] })] })
        expect(lapsed.text).not.toMatch(COVERED)
        expect(lapsed.text).not.toContain(RULE_GAP.title.el)
        expect(lapsed.container.querySelector('[data-count="attention.coveredCount"]')).toBeNull()
    })

    it("guidance decides density: explain everything shows the why line, on my own hides the coaching lines", () => {
        const why = "Είπες ότι άλλοι βασίζονται στο εισόδημά σου."
        const expanded = draw({ profile: FAMILY, statements: FAMILY_SAID, needs: { guidancePreference: "explain_everything" } })
        expect(expanded.text).toContain(why)
        expect(expanded.text).toContain(mapLabels.next.check_first_policy)
        expect(expanded.container.querySelector("details")).toBeNull()

        const collapsed = draw({ profile: FAMILY, statements: FAMILY_SAID, needs: { guidancePreference: "just_what_matters" } })
        expect(collapsed.container.querySelector("details")).toBeTruthy()
        expect(collapsed.container.querySelector("details summary")?.textContent).toBe(mapLabels.whyLabel)
        expect(collapsed.container.querySelector("details")?.textContent).toContain(why)

        const minimal = draw({ profile: FAMILY, statements: FAMILY_SAID, needs: { guidancePreference: "on_my_own" } })
        expect(minimal.text).not.toContain(why)
        for (const next of Object.values(mapLabels.next)) expect(minimal.text).not.toContain(next)
        expect(minimal.container.querySelector("details")).toBeNull()
        // The facts stay whatever the density: the alignment, the unknowns, the confidence.
        expect(minimal.text).toContain(mapLabels.alignment.not_yet_checked)
        expect(minimal.text).toContain("Δεν ξέρουμε ακόμη: το εισόδημά σου")
        expect(minimal.text).toContain(mapLabels.confidence.inferred)
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
