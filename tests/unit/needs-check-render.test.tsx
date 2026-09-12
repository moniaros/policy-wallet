import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import React from "react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }))
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: vi.fn() }))

import { AreaDetail } from "@/components/protection/AreaDetail"
import { buildAreaDetail, questionFlowCopy, type AreaPolicyRow } from "@/components/protection/area-detail-model"
import { getTranslations } from "@/lib/i18n"
import { buildAttentionAreas } from "@/lib/protection/attention-areas"
import { areaForPolicyLine, buildCoverageModel, type PolicyEvidenceInput } from "@/lib/protection/coverage-model"
import type { FactProvenanceMap } from "@/lib/protection/evidence"
import { needsAgainstCover, DEATH_BENEFIT_PATH } from "@/lib/protection/needs-against-cover"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { deriveProtectionPriorities } from "@/lib/services/protection-profile/derive-priorities"

/**
 * PW-PROVENANCE-01 W3-01 — the block on the area detail, rendered through the
 * real composition. What it asserts is the OUTCOME the plan names: a published
 * comparison prints both figures with their sources and the page; a question
 * prints as a question and is marked unpublished; the block is absent off the
 * life line's area. Copy comes from the dictionary, never from this file.
 */

const NOW = new Date("2026-09-12T10:00:00Z")
const LIFE_AREA = areaForPolicyLine("life").area

function acord(deathBenefit: number, verified: boolean | undefined, page = 2) {
    return {
        lifeAndInvestment: { deathBenefit },
        coverages: [{ name: "Κεφάλαιο θανάτου", limit: deathBenefit }],
        extraction: { sources: { [`acordData.${DEATH_BENEFIT_PATH}`]: { page, snippet: "x", ...(verified === undefined ? {} : { verified }) } } },
    }
}

function renderLifeArea(profile: Record<string, unknown>, provenance: FactProvenanceMap, acordData: unknown, language: "el" | "en" = "el") {
    const t = getTranslations(language)
    const ctx = toLifeContext({ answeredFields: Object.keys(profile), ...profile } as any, NOW)
    const evidence: PolicyEvidenceInput[] = [
        { id: "life-1", lineOfBusiness: "life", lifecycle: "active", detail: "analysed", coverages: [{ name: "Κεφάλαιο θανάτου", limit: 50000 }], gaps: [] },
    ]
    const assessments = assessRisks(ctx, [{ id: "life-1", lineOfBusiness: "life", status: "active", acordData } as any])
    const areas = buildAttentionAreas({
        priorities: deriveProtectionPriorities(ctx, null),
        assessments,
        coverage: buildCoverageModel(evidence),
        provenance,
        ctx,
        needs: {},
        language,
    })
    const comparisons = needsAgainstCover({ ctx, provenance, policies: [{ id: "life-1", lob: "life", held: true, acordData }] })
    const rows = new Map<string, AreaPolicyRow>([
        ["life-1", { id: "life-1", insurerName: "Εθνική", policyNumber: "L-1", lineOfBusiness: "life", status: "active", endDate: new Date("2027-01-01"), acordData } as any],
    ])
    const build = (area: typeof LIFE_AREA) =>
        buildAreaDetail({
            view: areas.find((a) => a.area === area)!,
            assessments,
            ctx,
            provenance,
            policyRows: rows,
            uncertaintyReasons: [],
            deepAnalysisLocked: false,
            needsAgainstCover: comparisons,
            t,
            language,
            now: NOW,
        })
    const model = build(LIFE_AREA)
    const other = build(LIFE_AREA === "household" ? "mobility" : "household")
    const rendered = render(<AreaDetail model={model} copy={t.protection.attention} flowCopy={questionFlowCopy(t)} onAnswer={async () => ({ ok: true, next: null, remainingUnknown: 0, skipped: [] }) as any} />)
    return { ...rendered, model, other, comparisons, t }
}

const stamp = (source: "assessment" | "onboarding", precision: "exact" | "coarse") => ({ source, precision, at: "2026-03-04T09:00:00Z" })
const EXACT: FactProvenanceMap = { annualIncome: stamp("assessment", "exact"), dependentsCount: stamp("onboarding", "exact"), incomeDependency: stamp("assessment", "exact") }
const PROFILE = { annualIncome: 18000, incomeDependency: "primary", dependentsCount: 2 }

describe("the needs-against-cover block on the area detail", () => {
    it("publishes a shortfall with both figures, the income's month, the page, and the assumption — and only on the life line's area", () => {
        const { container, model, other, t } = renderLifeArea(PROFILE, EXACT, acord(50000, true, 2))
        expect(model.needsCheck?.verdict).toBe("shortfall")
        expect(other.needsCheck).toBeNull()
        const block = container.querySelector("[data-needs-check]")!
        expect(block.getAttribute("data-needs-check")).toBe("shortfall")
        expect(block.getAttribute("data-published")).toBe("true")
        const text = block.textContent ?? ""
        expect(text).toContain(t.protection.attention.detail.needs.title)
        expect(text).toContain("50.000")
        expect(text).toContain("180.000")
        expect(text).toContain("130.000")
        expect(text).toContain("18.000")
        expect(text).toContain("10 έτη")
        expect(text).toContain("σελίδα 2")
        expect(text).toContain("Μάρτιος 2026")
        expect(text).toContain("παραδοχή")
    })

    it("an unconfirmed citation renders as a question, unpublished, and still shows the need it is about", () => {
        const { container } = renderLifeArea(PROFILE, EXACT, acord(50000, false, 2))
        const block = container.querySelector("[data-needs-check]")!
        expect(block.getAttribute("data-needs-check")).toBe("question")
        expect(block.getAttribute("data-published")).toBe("false")
        expect(block.textContent).toContain("δεν επιβεβαιώθηκε")
        expect(block.textContent).toContain("18.000")
        expect(block.textContent).toContain("10 έτη")
        expect(block.textContent).not.toContain("υπολείπονται")
    })

    it("a coarse income renders as a question naming the weaker side; a missing fact names the fact", () => {
        const coarse = renderLifeArea(PROFILE, { ...EXACT, annualIncome: stamp("onboarding", "coarse") }, acord(50000, true))
        expect(coarse.container.querySelector("[data-needs-check]")!.textContent).toContain("δεν δηλώσατε εσείς ακριβώς")
        coarse.unmount()
        const missing = renderLifeArea({ dependentsCount: 2 }, {}, acord(50000, true))
        const text = missing.container.querySelector("[data-needs-check]")!.textContent ?? ""
        expect(text).toContain("το ετήσιο εισόδημά σας")
        expect(text).toContain("πόσο βασίζεται σε αυτό το νοικοκυριό")
        expect(text).not.toContain("πόσα εξαρτώμενα μέλη")
    })

    it("renders in English from the same model", () => {
        const { container } = renderLifeArea(PROFILE, EXACT, acord(50000, true, 2), "en")
        const text = container.querySelector("[data-needs-check]")!.textContent ?? ""
        expect(text).toContain("shortfall")
        expect(text).toContain("page 2")
        expect(text).toContain("March 2026")
    })
})
