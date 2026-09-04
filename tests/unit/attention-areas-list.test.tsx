import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import React from "react"

import { AttentionAreasCard } from "@/components/protection/AttentionAreasCard"
import { UnknownFactorsCard } from "@/components/protection/UnknownFactorsCard"
import { areaListItems, unknownFactorItems } from "@/components/protection/area-detail-model"
import { getTranslations } from "@/lib/i18n"
import { attentionSummary, buildAttentionAreas, type AttentionAreaView } from "@/lib/protection/attention-areas"
import { buildCoverageModel, type PolicyEvidenceInput } from "@/lib/protection/coverage-model"
import { AREA_IDS } from "@/lib/protection/domains"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks, factorsToResolve, type HeldPolicy } from "@/lib/services/gap-engine/risk-assessment"
import { deriveProtectionPriorities } from "@/lib/services/protection-profile/derive-priorities"

/**
 * The areas list on /protection?lens=risk — honesty on rendered output.
 *
 * Every fixture goes through the real assembly (facts → toLifeContext,
 * exposure → assessRisks, protection → buildCoverageModel, importance →
 * deriveProtectionPriorities, composition → buildAttentionAreas). The
 * assertions are the register rules of docs/planning/PERSONAL_RISK_PROFILE.md
 * §C: «Φαίνεται να καλύπτεται» renders ONLY on an `appears_covered` row, a
 * not-yet-checked row never says «δεν έχετε», the counts are counts of
 * words under the registered keys, and the voice is the formal plural.
 */

const t = getTranslations("el")
const COPY = t.protection.attention
const COVERED = COPY.alignment.appears_covered

const FAMILY = {
    childrenCount: 1,
    dependentsCount: 2,
    employmentStatus: "employed",
    vehiclesCount: 1,
    answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "vehiclesCount"],
}

function world(policies: PolicyEvidenceInput[] = []): { areas: AttentionAreaView[]; unknown: ReturnType<typeof unknownFactorItems> } {
    const ctx = toLifeContext(FAMILY as any)
    const held: HeldPolicy[] = policies
        .filter((p) => p.lifecycle === "active" || p.lifecycle === "expiring_soon")
        .map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: "active" }))
    const assessments = assessRisks(ctx, held)
    const areas = buildAttentionAreas({
        priorities: deriveProtectionPriorities(ctx, null),
        assessments,
        coverage: buildCoverageModel(policies),
        provenance: {},
        ctx,
        needs: {},
        language: "el",
    })
    return { areas, unknown: unknownFactorItems(factorsToResolve(assessments), areas, "el") }
}

const LIFE: PolicyEvidenceInput = { id: "life-1", lineOfBusiness: "life", lifecycle: "active", detail: "summary_only", gaps: [] }
const MOTOR_ANALYSED: PolicyEvidenceInput = { id: "mot-1", lineOfBusiness: "motor", lifecycle: "active", detail: "analysed", coverages: [{ name: "Αστική ευθύνη" }], gaps: [] }

function renderList(areas: AttentionAreaView[]) {
    return render(<AttentionAreasCard items={areaListItems(areas, "el", COPY)} summary={attentionSummary(areas)} copy={COPY} />)
}

describe("the areas list — a covered word only with the evidence for it", () => {
    it("with no policy seen, no row says «Φαίνεται να καλύπτεται» and every row speaks one of the five words", () => {
        const { areas } = world()
        const { container } = renderList(areas)
        const rows = Array.from(container.querySelectorAll("a[data-area]"))
        expect(rows.length).toBe(AREA_IDS.length)
        for (const row of rows) {
            expect(row.textContent).not.toContain(COVERED)
            const word = Object.values(COPY.alignment).find((w) => row.textContent!.includes(w))
            expect(word, `${row.getAttribute("data-area")} carries no alignment word`).toBeTruthy()
        }
        expect(container.querySelector('[data-count="attention.coveredCount"]')).toBeNull()
    })

    it("a held life policy makes household «Φαίνεται να καλύπτεται» — with the limits caveat while summary-only — and nothing else", () => {
        const { areas } = world([LIFE])
        const { container } = renderList(areas)
        const household = container.querySelector('a[data-area="household"]')!
        expect(household.getAttribute("data-alignment")).toBe("appears_covered")
        expect(household.textContent).toContain(COVERED)
        expect(household.textContent).toContain(COPY.caveats.limits_unread)
        for (const row of Array.from(container.querySelectorAll("a[data-area]"))) {
            const covered = row.getAttribute("data-alignment") === "appears_covered"
            expect(row.textContent!.includes(COVERED), `${row.getAttribute("data-area")}`).toBe(covered)
        }
        const count = container.querySelector('[data-count="attention.coveredCount"]')
        expect(count).toBeTruthy()
        expect(Number(count!.textContent!.match(/\d+/)?.[0])).toBe(areas.filter((a) => a.alignment === "appears_covered").length)
    })

    it("an analysed line drops the limits caveat", () => {
        const { areas } = world([MOTOR_ANALYSED])
        const { container } = renderList(areas)
        const mobility = container.querySelector('a[data-area="mobility"]')!
        expect(mobility.getAttribute("data-alignment")).toBe("appears_covered")
        expect(mobility.textContent).not.toContain(COPY.caveats.limits_unread)
    })

    it("a row never says «δεν έχετε» — absence of a seen policy is not absence of cover", () => {
        const { areas } = world()
        const { container } = renderList(areas)
        expect(container.textContent).not.toMatch(/δεν έχετε/i)
        expect(container.textContent).toContain(COPY.caveats.absence_not_evidence)
    })

    it("activated areas come first and outside the dormant disclosure; dormant ones collapse under «Δεν το εξετάσαμε ακόμη»", () => {
        const { areas } = world()
        const { container } = renderList(areas)
        const rows = Array.from(container.querySelectorAll("a[data-area]"))
        const activated = new Set(areas.filter((a) => a.activated).map((a) => a.area))
        let seenDormant = false
        for (const row of rows) {
            const inside = Boolean(row.closest("details"))
            expect(inside).toBe(!activated.has(row.getAttribute("data-area") as any))
            if (inside) seenDormant = true
            else expect(seenDormant, "an activated row rendered after a dormant one").toBe(false)
        }
        expect(container.querySelector("details summary")!.textContent).toContain(COPY.headings.dormant)
    })

    it("every row carries the importance word, the confidence phrase and a chevron link to its detail", () => {
        const { areas } = world()
        const { container } = renderList(areas)
        for (const view of areas) {
            const row = container.querySelector(`a[data-area="${view.area}"]`)!
            expect(row.getAttribute("href")).toBe(`/protection/areas/${view.area}`)
            expect(row.textContent).toContain(COPY.importance[view.importance])
            expect(row.textContent).toContain(COPY.confidence[view.confidence])
            expect(row.getAttribute("aria-label")).toContain(view.label)
        }
        expect(Number(container.querySelector('[data-count="attention.areaCount"]')!.textContent!.match(/\d+/)?.[0])).toBe(AREA_IDS.length)
    })

    it("speaks the formal plural and never «συμβόλαιο», «εκτεθειμένος» or a score", () => {
        const { areas } = world([LIFE])
        const { container } = renderList(areas)
        const text = container.textContent ?? ""
        expect(text).not.toMatch(/συμβόλαι|συμβολαί/i)
        expect(text).not.toMatch(/εκτεθειμ/i)
        expect(text).not.toMatch(/\bσου\b|\bσε σένα\b/)
        expect(text).not.toMatch(/\d+\s*%/)
        expect(text).not.toMatch(/\bscore\b/i)
    })
})

describe("«Τι χρειάζεται ακόμη να καταλάβουμε» — the engine's unknown factors as nouns", () => {
    it("renders every factor the engine still needs, as its noun, linking to the area that asks it", () => {
        const { areas, unknown } = world()
        expect(unknown.length).toBeGreaterThan(0)
        const { container } = render(<UnknownFactorsCard items={unknown} copy={COPY.needs} />)
        for (const item of unknown) {
            const link = container.querySelector(`a[data-factor="${item.factor}"]`)!
            expect(link, item.factor).toBeTruthy()
            expect(link.textContent).toContain(item.noun)
            expect(link.textContent).toContain(item.areaLabel)
            expect(link.getAttribute("href")).toBe(`/protection/areas/${item.area}`)
            // The area it names really does still lack the factor.
            expect(areas.find((a) => a.area === item.area)!.unknownFactors).toContain(item.factor)
        }
    })

    it("the Art. 9 factor is only ever routed to the health area", () => {
        const { unknown } = world()
        for (const item of unknown.filter((i) => i.factor === "health")) expect(item.area).toBe("health")
    })

    it("with nothing left to resolve it says so — about facts, never about cover", () => {
        const { container } = render(<UnknownFactorsCard items={[]} copy={COPY.needs} />)
        expect(container.textContent).toContain(COPY.needs.none)
        expect(container.textContent).not.toContain(COVERED)
    })
})
