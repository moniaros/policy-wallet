/**
 * A renewal notice on an already-identified policy may move the PERIOD.
 *
 * `assessExtractionEvidence` rejects `renewal_notice` by definition —
 * POLICY_BEARING_KINDS is {policy_schedule, certificate} — and `buildMetadata`
 * answers an insufficient verdict by returning the STORED values unchanged.
 * That gate is right about what it was built for: a terms booklet or a set of
 * blank forms names an insurer on every page and must never overwrite a real
 * contract.
 *
 * But it also caught the ανανεωτήριο the customer deliberately attached to a
 * policy they had already named. Free/Starter runs go through
 * `extractBasicSummary` → `buildMetadata`, so for those users the renewal dates
 * NEVER moved — not "until you refresh", ever — and the wallet went on saying
 * «Το ασφαλιστήριο έχει λήξει» over a policy that had been renewed. Only the
 * deep (pro) pipeline escaped, because it writes dates from the raw extraction
 * and bypasses this function entirely.
 *
 * The exception is deliberately narrow: the period moves, the IDENTITY does not.
 * A renewal notice names a policy; it does not define one.
 */
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-test",
        GEMINI_MODEL_EXTRACTION: "gemini-test",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-test",
        GEMINI_MODEL_QA: "gemini-test",
        GEMINI_MODEL_FALLBACK: "gemini-test",
        FF_AI_FAILOVER_OPENAI: "false",
        FF_AI_DEGRADED_COMPLETION: "true",
        FF_AI_REMEDIATION_ALERTS: "false",
        FF_AI_REMEDIATION_CANARY_MODE: "off",
        AI_ALLOW_FULL_FAILOVER: "true",
    },
}))
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { PolicyAnalysisOrchestratorService } from "../../lib/services/analysis/policy-analysis-orchestrator.service"

const buildMetadata = (policy: any, extraction: any) =>
    (new PolicyAnalysisOrchestratorService() as any).buildMetadata(policy, extraction)

const IDENTIFIED = {
    id: "pol_1",
    insurerName: "Εθνική Ασφαλιστική",
    policyNumber: "1651622",
    lineOfBusiness: "motor",
    startDate: new Date("2025-07-11"),
    endDate: new Date("2026-07-11"),
    premiumAmount: 320,
    coverageSummary: "Η αρχική περίληψη",
}

const RENEWAL = {
    documentKind: "renewal_notice",
    evidence: { sufficient: false, reason: "not_a_policy_document", documentKind: "renewal_notice" },
    startDate: "2026-07-11",
    endDate: "2027-07-11",
    insurerName: "Κάποιος Άλλος",
    // The SAME policy, punctuated the way the renewal happens to print it —
    // which also proves the number comparison is presentation-insensitive
    // end to end, not just in its own unit test.
    policyNumber: "165-1622",
    premiumAmount: 355,
    coverageSummary: "Prose the notice happens to carry",
}

describe("a renewal notice on an identified policy", () => {
    it("moves the period", () => {
        const m = buildMetadata(IDENTIFIED, RENEWAL)
        expect(m.endDate?.toISOString().slice(0, 10)).toBe("2027-07-11")
        expect(m.startDate?.toISOString().slice(0, 10)).toBe("2026-07-11")
    })

    it("does NOT redefine the policy's identity", () => {
        // The whole reason the gate exists. A notice that names a different
        // insurer or number must not rewrite the contract it refers to.
        const m = buildMetadata(IDENTIFIED, RENEWAL)
        expect(m.insurerName).toBe("Εθνική Ασφαλιστική")
        expect(m.policyNumber).toBe("1651622")
    })

    it("does not restate the cover", () => {
        // A notice prices the next term; it does not describe what is covered.
        expect(buildMetadata(IDENTIFIED, RENEWAL).coverageSummary).toBe("Η αρχική περίληψη")
    })

    it("takes the renewal premium, which is the other thing a notice does state", () => {
        expect(buildMetadata(IDENTIFIED, RENEWAL).premiumAmount).toBe(355)
    })
})

describe("the gate stays closed everywhere else", () => {
    it("a terms booklet still cannot touch a thing", () => {
        const booklet = {
            ...RENEWAL,
            documentKind: "terms_and_conditions",
            evidence: { sufficient: false, reason: "not_a_policy_document", documentKind: "terms_and_conditions" },
        }
        const m = buildMetadata(IDENTIFIED, booklet)
        expect(m.endDate).toEqual(IDENTIFIED.endDate)
        expect(m.insurerName).toBe("Εθνική Ασφαλιστική")
        expect(m.premiumAmount).toBe(320)
    })

    it("a renewal notice on a PLACEHOLDER policy cannot bootstrap one", () => {
        // Nothing here has been identified, so a notice is not evidence of a
        // contract — it is the origin case the gate refuses outright.
        const placeholder = {
            ...IDENTIFIED,
            insurerName: "Unknown Insurer",
            policyNumber: "PENDING-1750000000000",
        }
        const m = buildMetadata(placeholder, RENEWAL)
        expect(m.endDate).toEqual(IDENTIFIED.endDate)
        expect(m.startDate).toEqual(IDENTIFIED.startDate)
    })

    it("a no-identifying-evidence verdict is still refused, whatever the kind says", () => {
        const empty = { ...RENEWAL, evidence: { sufficient: false, reason: "no_identifying_evidence" } }
        expect(buildMetadata(IDENTIFIED, empty).endDate).toEqual(IDENTIFIED.endDate)
    })
})

/**
 * ...and only when it names THIS policy.
 *
 * Nothing verifies the pairing: the customer picks the policy and attaches a
 * file. Attach the wrong ανανεωτήριο and, because a renewal is trusted
 * precisely to move dates, the period of a different contract lands here
 * silently.
 */
describe("a renewal that names a different policy", () => {
    const WRONG = { ...RENEWAL, policyNumber: "9999999" }

    it("does not move the period", () => {
        const m = buildMetadata(IDENTIFIED, WRONG)
        expect(m.endDate).toEqual(IDENTIFIED.endDate)
        expect(m.startDate).toEqual(IDENTIFIED.startDate)
    })

    it("does not take its premium either — nothing on it describes this policy", () => {
        expect(buildMetadata(IDENTIFIED, WRONG).premiumAmount).toBe(320)
    })

    it("leaves the identity exactly as recorded", () => {
        const m = buildMetadata(IDENTIFIED, WRONG)
        expect(m.insurerName).toBe("Εθνική Ασφαλιστική")
        expect(m.policyNumber).toBe("1651622")
    })
})
