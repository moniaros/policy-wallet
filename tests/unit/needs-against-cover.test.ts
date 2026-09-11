import { describe, it, expect } from "vitest"

import { DOCUMENT_EVIDENCE_STATES } from "@/lib/gaps/document-evidence"
import { EVIDENCE_LEVELS, evidenceAtLeast, type EvidenceLevel, type FactProvenanceMap } from "@/lib/protection/evidence"
import {
    DEATH_BENEFIT_PATH,
    INCOME_REPLACEMENT_YEARS,
    PUBLISHABLE_COVER_FLOOR,
    PUBLISHABLE_NEED_FLOOR,
    compareLifeNeed,
    deathBenefitCoverFrom,
    documentEvidenceLevel,
    isPublishedNeedsVerdict,
    lifeNeedFrom,
    needsAgainstCover,
    type CoverSide,
    type NeedSide,
    type NeedsMissing,
} from "@/lib/protection/needs-against-cover"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"

/**
 * PW-PROVENANCE-01 W3-01. Trace cases for the first needs-against-cover pair,
 * and the guard that keeps it honest: over EVERY combination of the six
 * profile evidence levels and the three document states — enumerated from the
 * two scales' own constants, never listed here — a comparison is published
 * («shortfall» / «adequate») only when the need rests on figures the person
 * gave and the cover on a figure the document text confirmed. Anything weaker
 * is a question, and the comparison names the weaker side.
 */

const NOW = new Date("2026-09-12T10:00:00Z")
const stamp = (source: "onboarding" | "assessment" | "advisor" | "policy", precision: "exact" | "coarse", at = "2026-03-04T09:00:00Z") => ({ source, precision, at })

function ctxOf(profile: Record<string, unknown>) {
    return toLifeContext({ answeredFields: Object.keys(profile), ...profile } as any, NOW)
}

const exactProvenance: FactProvenanceMap = {
    annualIncome: stamp("assessment", "exact"),
    dependentsCount: stamp("onboarding", "exact"),
    incomeDependency: stamp("assessment", "exact"),
}

function lifePolicy(id: string, deathBenefit: number | undefined, source?: { verified?: boolean; page?: number; verifiedPage?: number }, held = true) {
    return {
        id,
        lob: "life",
        held,
        acordData: {
            lifeAndInvestment: deathBenefit === undefined ? {} : { deathBenefit },
            ...(source ? { extraction: { sources: { [`acordData.${DEATH_BENEFIT_PATH}`]: { snippet: "x", ...source } } } } : {}),
        },
    }
}

describe("needs against cover — the life death-benefit pair", () => {
    it("computes the need from the three facts, with the weakest factor's evidence and the income's date", () => {
        const side = lifeNeedFrom(ctxOf({ annualIncome: 18000, incomeDependency: "primary", dependentsCount: 2 }), exactProvenance)
        expect("need" in side).toBe(true)
        const need = (side as { need: NeedSide }).need
        expect(need.amount).toBe(18000 * INCOME_REPLACEMENT_YEARS.primary)
        expect(need.years).toBe(10)
        expect(need.dependants).toBe(2)
        expect(need.evidence).toBe("user_reported")
        expect(need.incomeAt).toBe("2026-03-04T09:00:00Z")
    })

    it("a household with no dependants has no income-replacement need — not applicable, not a question", () => {
        const side = lifeNeedFrom(ctxOf({ annualIncome: 18000, incomeDependency: "primary", dependentsCount: 0 }), exactProvenance)
        expect(side).toEqual({ missing: [], notApplicable: true })
        expect(compareLifeNeed(side, deathBenefitCoverFrom([lifePolicy("p", 50000, { verified: true, page: 2 })])).verdict).toBe("not_applicable")
    })

    it("names each missing fact rather than guessing one", () => {
        expect(lifeNeedFrom(ctxOf({}), {})).toEqual({ missing: ["dependants", "income", "income_dependency"] })
        expect(lifeNeedFrom(ctxOf({ dependentsCount: 1, annualIncome: 20000 }), {})).toEqual({ missing: ["income_dependency"] })
    })

    it("sums the death benefits of the held life policies that state one, and cites the page only when exactly one does", () => {
        const one = deathBenefitCoverFrom([lifePolicy("a", 50000, { verified: true, page: 2 }), lifePolicy("expired", 90000, { verified: true, page: 1 }, false)])
        expect(one).toEqual({ cover: { amount: 50000, evidence: "policy_verified", documentEvidence: "policy_verified", policyIds: ["a"], page: 2 } })
        const two = deathBenefitCoverFrom([lifePolicy("a", 50000, { verified: true, page: 2 }), lifePolicy("b", 30000, { verified: true, page: 3 })])
        expect((two as { cover: CoverSide }).cover).toMatchObject({ amount: 80000, page: null, policyIds: ["a", "b"] })
        expect(deathBenefitCoverFrom([lifePolicy("a", undefined)])).toEqual({ missing: ["death_benefit"] })
        expect(deathBenefitCoverFrom([{ id: "m", lob: "motor", held: true, acordData: {} }])).toEqual({ missing: ["life_policy"] })
    })

    it("publishes a shortfall when both sides carry evidence, and carries the computed figure with the operands", () => {
        const out = needsAgainstCover({
            ctx: ctxOf({ annualIncome: 18000, incomeDependency: "primary", dependentsCount: 2 }),
            provenance: exactProvenance,
            policies: [lifePolicy("a", 50000, { verified: true, page: 2 })],
        })
        expect(out).toHaveLength(1)
        expect(out[0]).toMatchObject({ verdict: "shortfall", shortfall: 130000, weaker: "user_reported", missing: [] })
        expect(out[0].cover?.page).toBe(2)
        expect(out[0].need?.amount).toBe(180000)
    })

    it("a citation the text did not confirm makes it a question, naming the citation, never a gap", () => {
        const out = compareLifeNeed(
            lifeNeedFrom(ctxOf({ annualIncome: 18000, incomeDependency: "primary", dependentsCount: 2 }), exactProvenance),
            deathBenefitCoverFrom([lifePolicy("a", 50000, { verified: false, page: 2 })])
        )
        expect(out.verdict).toBe("question")
        expect(out.missing).toEqual(["citation"])
        expect(out.weaker).toBe("inferred")
        expect(out.shortfall).toBe(130000) // the figure is still computed — it is what the question is about
    })

    it("an income the person did not state exactly makes it a question, naming the need side", () => {
        const coarse: FactProvenanceMap = { ...exactProvenance, annualIncome: stamp("onboarding", "coarse") }
        const out = compareLifeNeed(
            lifeNeedFrom(ctxOf({ annualIncome: 18000, incomeDependency: "primary", dependentsCount: 2 }), coarse),
            deathBenefitCoverFrom([lifePolicy("a", 50000, { verified: true, page: 2 })])
        )
        expect(out).toMatchObject({ verdict: "question", weaker: "inferred", missing: ["need_evidence"] })
        const advisor: FactProvenanceMap = { ...exactProvenance, annualIncome: stamp("advisor", "exact") }
        expect(compareLifeNeed(lifeNeedFrom(ctxOf({ annualIncome: 18000, incomeDependency: "primary", dependentsCount: 2 }), advisor), deathBenefitCoverFrom([lifePolicy("a", 50000, { verified: true })])))
            .toMatchObject({ verdict: "question", weaker: "third_party_reported" })
    })

    it("adequate when the confirmed cover meets the stated need", () => {
        const out = compareLifeNeed(
            lifeNeedFrom(ctxOf({ annualIncome: 18000, incomeDependency: "minor", dependentsCount: 1 }), exactProvenance),
            deathBenefitCoverFrom([lifePolicy("a", 50000, { verified: true, page: 4 })])
        )
        expect(out).toMatchObject({ verdict: "adequate", shortfall: 36000 - 50000, weaker: "user_reported" })
    })
})

describe("guard — a comparison is published only when both sides carry evidence (enumerated over both scales)", () => {
    const need = (evidence: EvidenceLevel): { need: NeedSide } => ({
        need: { amount: 100000, evidence, annualIncome: 10000, incomeDependency: "primary", dependants: 1, years: 10, incomeAt: null },
    })
    const cover = (documentEvidence: (typeof DOCUMENT_EVIDENCE_STATES)[number]) => {
        const level = documentEvidenceLevel(documentEvidence)
        return level === null
            ? { missing: ["death_benefit"] as NeedsMissing[] }
            : { cover: { amount: 50000, evidence: level, documentEvidence, policyIds: ["p"], page: null } as CoverSide }
    }

    it("over every (profile level × document state): published ⇔ need ≥ user_reported and cover confirmed; otherwise the weaker side is named", () => {
        let published = 0
        let questions = 0
        for (const level of EVIDENCE_LEVELS) {
            for (const state of DOCUMENT_EVIDENCE_STATES) {
                const out = compareLifeNeed(need(level), cover(state))
                const coverLevel = documentEvidenceLevel(state)
                if (coverLevel === null) {
                    expect(out.verdict, `${level} × ${state}`).toBe("not_checkable")
                    continue
                }
                const shouldPublish = evidenceAtLeast(level, PUBLISHABLE_NEED_FLOOR) && evidenceAtLeast(coverLevel, PUBLISHABLE_COVER_FLOOR)
                expect(isPublishedNeedsVerdict(out.verdict), `${level} × ${state}`).toBe(shouldPublish)
                if (shouldPublish) published++
                else {
                    questions++
                    expect(out.verdict).toBe("question")
                    // the weaker side is the one below its floor
                    const weakerIsNeed = !evidenceAtLeast(level, PUBLISHABLE_NEED_FLOOR)
                    expect(out.missing, `${level} × ${state}`).toEqual([
                        ...(coverLevel !== "policy_verified" ? ["citation"] : []),
                        ...(weakerIsNeed ? ["need_evidence"] : []),
                    ])
                }
            }
        }
        // 6 levels × 1 confirmed state: only the levels at or above the floor publish.
        expect(published).toBe(EVIDENCE_LEVELS.filter((l) => evidenceAtLeast(l, PUBLISHABLE_NEED_FLOOR)).length)
        expect(questions).toBe(EVIDENCE_LEVELS.length * 2 - published)
    })

    it("probe — a comparator that published on an inferred need would be caught by the matrix", () => {
        const lax = (n: { need: NeedSide }, c: ReturnType<typeof cover>) => ({ ...compareLifeNeed(n, c), verdict: "shortfall" as const })
        const out = lax(need("inferred"), cover("policy_verified"))
        expect(isPublishedNeedsVerdict(out.verdict)).toBe(true)
        expect(evidenceAtLeast(out.need!.evidence, PUBLISHABLE_NEED_FLOOR)).toBe(false) // what the real matrix asserts against
    })
})
