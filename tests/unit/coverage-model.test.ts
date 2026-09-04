import { describe, expect, it } from "vitest"

import { AREA_IDS } from "@/lib/protection/domains"
import {
    allLines,
    areaForPolicyLine,
    areaHasHeldLine,
    buildCoverageModel,
    emptyCoverageModel,
    heldLines,
    isHeldBand,
    type PolicyEvidenceInput,
} from "@/lib/protection/coverage-model"

/**
 * Layer 4 — docs/planning/PERSONAL_RISK_PROFILE.md §C.
 *
 * Built from policies and rule findings only. The one rule that matters most:
 * an EXPIRED policy is kept and flagged, and an area whose only line has
 * expired is NOT held — a lapsed home policy answers nothing about the home
 * today, so it must never make the area read as covered.
 */

const policy = (over: Partial<PolicyEvidenceInput> = {}): PolicyEvidenceInput => ({
    id: "p-1",
    lineOfBusiness: "life",
    lifecycle: "active",
    detail: "summary_only",
    gaps: [],
    ...over,
})

const gap = (id: string) => ({ id, ruleId: `rule_${id}`, slug: `slug-${id}`, severity: "medium", title: { el: `Εύρημα ${id}`, en: `Finding ${id}` } })

describe("buildCoverageModel — shape", () => {
    it("always carries every attention area, empty when nothing is held", () => {
        const model = buildCoverageModel([])
        expect(Object.keys(model).sort()).toEqual([...AREA_IDS].sort())
        for (const id of AREA_IDS) expect(model[id]).toEqual({ lines: [], gaps: [], hasAnalysed: false })
        expect(emptyCoverageModel()).toEqual(model)
    })

    it("is built from policies alone — the signature admits no answer, statement or priority", () => {
        expect(buildCoverageModel.length).toBe(1)
    })

    it("lists a policy under the area of its normalised line, and a raw string still resolves", () => {
        const model = buildCoverageModel([
            policy({ id: "m", lineOfBusiness: "Motorbike" }),
            policy({ id: "h", lineOfBusiness: "home" }),
            policy({ id: "l", lineOfBusiness: "life" }),
        ])
        expect(model.mobility.lines.map((l) => [l.policyId, l.lob])).toEqual([["m", "motorbike"]])
        expect(model.residence.lines.map((l) => l.policyId)).toEqual(["h"])
        expect(model.household.lines.map((l) => l.policyId)).toEqual(["l"])
        expect(areaForPolicyLine("MOTOR")).toEqual({ area: "mobility", lob: "motor" })
    })

    it("a line nobody could classify lands in lifestyle as presence, never as an answer", () => {
        expect(areaForPolicyLine("zzz-unclassifiable")).toEqual({ area: "lifestyle", lob: "other" })
        const model = buildCoverageModel([policy({ id: "x", lineOfBusiness: "zzz-unclassifiable" })])
        expect(model.lifestyle.lines).toHaveLength(1)
    })

    it("every line says the document exists (policy_verified) and how much of it was read", () => {
        const model = buildCoverageModel([
            policy({ id: "s", detail: "summary_only" }),
            policy({ id: "a", detail: "analysed", coverages: [{ name: "death", limit: 100000 }] }),
        ])
        for (const line of model.household.lines) expect(line.evidence).toBe("policy_verified")
        const analysed = model.household.lines.find((l) => l.policyId === "a")!
        const summary = model.household.lines.find((l) => l.policyId === "s")!
        expect(analysed.coverages).toEqual([{ name: "death", limit: 100000 }])
        // Coverages are meaningful only when a deep run produced them.
        expect(summary.coverages).toEqual([])
        expect(model.household.hasAnalysed).toBe(true)
    })
})

describe("buildCoverageModel — expired and unplaceable policies do not count as held", () => {
    it("the bands: active and expiring_soon are in force; expired and other are not", () => {
        expect(isHeldBand("active")).toBe(true)
        expect(isHeldBand("expiring_soon")).toBe(true)
        expect(isHeldBand("expired")).toBe(false)
        expect(isHeldBand("other")).toBe(false)
    })

    it("keeps an expired policy in its area, flagged, and the area is NOT held", () => {
        const model = buildCoverageModel([policy({ id: "old", lifecycle: "expired", gaps: [gap("g1")] })])
        expect(model.household.lines).toHaveLength(1)
        expect(model.household.lines[0].lifecycle).toBe("expired")
        expect(model.household.lines[0].held).toBe(false)
        expect(areaHasHeldLine(model, "household")).toBe(false)
        expect(heldLines(model)).toEqual([])
        // Its findings are history, not open findings.
        expect(model.household.gaps).toHaveLength(1)
        expect(model.household.gaps[0].onHeldPolicy).toBe(false)
    })

    it("an expired analysed policy does not make the area `hasAnalysed`", () => {
        const model = buildCoverageModel([policy({ id: "old", lifecycle: "expired", detail: "analysed", coverages: [{ name: "x" }] })])
        expect(model.household.hasAnalysed).toBe(false)
    })

    it("a policy of unknown standing (`other`) is presence we cannot place in time", () => {
        const model = buildCoverageModel([policy({ id: "u", lifecycle: "other" })])
        expect(model.household.lines[0].held).toBe(false)
        expect(areaHasHeldLine(model, "household")).toBe(false)
    })

    it("a held line beside an expired one: the area is held, and held lines sort first", () => {
        const model = buildCoverageModel([
            policy({ id: "old", lifecycle: "expired" }),
            policy({ id: "new", lifecycle: "expiring_soon" }),
        ])
        expect(areaHasHeldLine(model, "household")).toBe(true)
        expect(model.household.lines.map((l) => l.policyId)).toEqual(["new", "old"])
        expect(heldLines(model).map((l) => l.policyId)).toEqual(["new"])
        expect(allLines(model).map((l) => l.policyId)).toEqual(["new", "old"])
    })
})

describe("buildCoverageModel — findings", () => {
    it("attaches each rule finding to the policy's area with its policy id, held ones first", () => {
        const model = buildCoverageModel([
            policy({ id: "a", lineOfBusiness: "motor", lifecycle: "expired", gaps: [gap("x")] }),
            policy({ id: "b", lineOfBusiness: "motor", lifecycle: "active", gaps: [gap("y"), gap("z")] }),
        ])
        expect(model.mobility.gaps.map((g) => [g.id, g.policyId, g.onHeldPolicy])).toEqual([
            ["y", "b", true],
            ["z", "b", true],
            ["x", "a", false],
        ])
        expect(model.mobility.gaps[0].title.el).toBe("Εύρημα y")
        expect(model.mobility.gaps[0].ruleId).toBe("rule_y")
    })
})
