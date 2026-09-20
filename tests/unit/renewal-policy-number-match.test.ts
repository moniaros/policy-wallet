import { describe, expect, it } from "vitest"
import { assessRenewalMatch, normalizePolicyNumber } from "../../lib/wallet/renewal-match"

const m = (storedPolicyNumber: string | null, extractedPolicyNumber: string | null) =>
    assessRenewalMatch({ storedPolicyNumber, extractedPolicyNumber })

describe("a renewal must name the policy it is attached to", () => {
    it("flags a document that names a different policy", () => {
        const r = m("9000001", "9999999")
        expect(r.matches).toBe(false)
        expect(r).toMatchObject({ reason: "policy_number_mismatch", expected: "9000001", found: "9999999" })
    })

    it("reports the ORIGINAL numbers, so the customer can find them on paper", () => {
        const r = m("900-0001", "AB 9999")
        expect(r).toMatchObject({ expected: "900-0001", found: "AB 9999" })
    })
})

describe("what must NOT be called a mismatch", () => {
    it("the same number punctuated differently", () => {
        // Insurers print the same number three ways across their own documents.
        expect(m("9000001", "900-0001").matches).toBe(true)
        expect(m("9000001", "900 0001").matches).toBe(true)
        expect(m("900/0001", "900.0001").matches).toBe(true)
    })

    it("Greek capitals that are visually identical to Latin ones", () => {
        // A Greek schedule and a Latin-keyboard extraction disagree byte-wise on
        // characters that render the same. Blocking here would tell the customer
        // their own paperwork is wrong.
        expect(m("ΑΒ1234", "AB1234").matches).toBe(true)
        expect(m("ΡΕ-77", "PE77").matches).toBe(true)
    })

    it("a silent document — absence is not evidence of the wrong policy", () => {
        expect(m("9000001", null).matches).toBe(true)
        expect(m("9000001", "").matches).toBe(true)
        expect(m(null, "9000001").matches).toBe(true)
    })

    it("a placeholder on either side — that is a failed read, not a wrong policy", () => {
        expect(m("PENDING-1750000000000", "9000001").matches).toBe(true)
        expect(m("9000001", "PENDING-1750000000000").matches).toBe(true)
    })

    it("case differences", () => {
        expect(m("ab1234", "AB1234").matches).toBe(true)
    })
})

describe("normalizePolicyNumber", () => {
    it("is presentation-insensitive but not digit-insensitive", () => {
        expect(normalizePolicyNumber(" 900-00 01 ")).toBe("9000001")
        // It must not collapse genuinely different numbers.
        expect(normalizePolicyNumber("9000001")).not.toBe(normalizePolicyNumber("1651623"))
    })

    it("survives null and undefined", () => {
        expect(normalizePolicyNumber(null)).toBe("")
        expect(normalizePolicyNumber(undefined)).toBe("")
    })
})
