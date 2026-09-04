import { describe, it, expect } from "vitest"
import {
    EVIDENCE_LEVELS,
    evidenceAtLeast,
    factEvidence,
    lowestEvidence,
    parseFactProvenance,
    protectionEvidence,
} from "@/lib/protection/evidence"

/**
 * The one confidence scale (docs/planning/PERSONAL_RISK_PROFILE.md §C). These
 * cases pin the ordering a composed conclusion inherits and the leniency the
 * stored JSON needs, because a malformed provenance entry must never take the
 * risk engine down with it.
 */
describe("evidence levels", () => {
    it("orders weakest to strongest with inferred below a third party's word, and that below the person's own", () => {
        expect(EVIDENCE_LEVELS).toEqual([
            "unknown",
            "inferred",
            "third_party_reported",
            "user_reported",
            "policy_verified",
            "externally_verified",
        ])
        expect(evidenceAtLeast("user_reported", "inferred")).toBe(true)
        expect(evidenceAtLeast("inferred", "user_reported")).toBe(false)
        expect(evidenceAtLeast("third_party_reported", "inferred")).toBe(true)
        expect(evidenceAtLeast("third_party_reported", "user_reported")).toBe(false)
        expect(lowestEvidence(["user_reported", "third_party_reported"])).toBe("third_party_reported")
    })

    it("a composed conclusion is as sure as its weakest input", () => {
        expect(lowestEvidence(["policy_verified", "user_reported", "inferred"])).toBe("inferred")
        expect(lowestEvidence(["policy_verified"])).toBe("policy_verified")
        expect(lowestEvidence([])).toBe("unknown")
        expect(lowestEvidence(["externally_verified", "unknown"])).toBe("unknown")
    })
})

describe("fact provenance", () => {
    it("a declared exact fact is user_reported; a floor is inferred; a document is policy_verified", () => {
        const at = "2026-09-04T12:00:00.000Z"
        expect(factEvidence({ source: "onboarding", precision: "exact", at })).toBe("user_reported")
        expect(factEvidence({ source: "onboarding", precision: "coarse", at })).toBe("inferred")
        expect(factEvidence({ source: "assessment", precision: "exact", at })).toBe("user_reported")
        expect(factEvidence({ source: "policy", precision: "exact", at })).toBe("policy_verified")
        expect(factEvidence(undefined)).toBe("unknown")
        expect(factEvidence(null)).toBe("unknown")
    })

    it("an advisor's exact figure is third_party_reported — never attributed to the person; an advisor's floor is still inferred", () => {
        const at = "2026-09-04T12:00:00.000Z"
        expect(factEvidence({ source: "advisor", precision: "exact", at })).toBe("third_party_reported")
        expect(factEvidence({ source: "advisor", precision: "coarse", at })).toBe("inferred")
        // A life event the person declared is their own word; one the advisor
        // recorded reaches the ledger as `advisor` (lib/services/life-events/service.ts).
        expect(factEvidence({ source: "life_event", precision: "exact", at })).toBe("user_reported")
        for (const source of ["onboarding", "quick_start", "assessment", "life_event", "questionnaire"] as const) {
            expect(factEvidence({ source, precision: "exact", at }), source).toBe("user_reported")
        }
    })

    it("parses the stored JSON leniently, dropping malformed entries rather than failing", () => {
        const parsed = parseFactProvenance({
            childrenCount: { source: "onboarding", precision: "exact", at: "2026-09-04T12:00:00.000Z" },
            dependentsCount: { source: "onboarding", precision: "coarse", at: "2026-09-04T12:00:00.000Z" },
            annualIncome: { source: "made_up", precision: "exact", at: "2026-09-04T12:00:00.000Z" },
            vehiclesCount: { source: "assessment", precision: "sort_of", at: "2026-09-04T12:00:00.000Z" },
            ownsHome: { source: "assessment", precision: "exact", at: "not a date" },
            residenceType: "owned",
            hasLoans: null,
        })
        expect(Object.keys(parsed).sort()).toEqual(["childrenCount", "dependentsCount"])
        expect(parsed.dependentsCount.precision).toBe("coarse")
    })

    it("tolerates a missing, scalar or array value", () => {
        expect(parseFactProvenance(null)).toEqual({})
        expect(parseFactProvenance(undefined)).toEqual({})
        expect(parseFactProvenance("x")).toEqual({})
        expect(parseFactProvenance([{ source: "onboarding" }])).toEqual({})
    })
})

describe("protection evidence", () => {
    it("a held policy is policy_verified whether or not its limits were read; no policy is unknown", () => {
        expect(protectionEvidence("summary_only")).toBe("policy_verified")
        expect(protectionEvidence("analysed")).toBe("policy_verified")
        expect(protectionEvidence(null)).toBe("unknown")
        expect(protectionEvidence(undefined)).toBe("unknown")
    })
})
