import { describe, expect, it } from "vitest"

import { deriveAiConsentState } from "@/lib/services/customer-resolution.service"

/**
 * Audit finding F-11.
 *
 * commitScannedPolicy decides AFTER the upload whether an analysis can run. The
 * advisor therefore spent a scan, a slice of the token budget and ~90s only to
 * be told "consent required" — and was shown an attestation checkbox that, for
 * a live account, the server correctly refuses to honour. This derivation moves
 * that verdict to BEFORE the upload, so it must stay in lockstep with the
 * server's own activation check.
 */

const base = {
    aiProcessingConsentVersion: null,
    password: null,
    emailVerified: null,
    lastActiveAt: null,
}

describe("deriveAiConsentState", () => {
    it("is granted whenever a consent version is on file", () => {
        expect(
            deriveAiConsentState({ ...base, aiProcessingConsentVersion: "v1" })
        ).toBe("granted")
    })

    it("treats agent-attested consent as granted too", () => {
        expect(
            deriveAiConsentState({
                ...base,
                aiProcessingConsentVersion: "agent-attested:v1:agent-123",
            })
        ).toBe("granted")
    })

    it("is attestable for an account the customer never activated", () => {
        expect(deriveAiConsentState(base)).toBe("attestable")
    })

    // Activation parity with commitScannedPolicy. Any of these three signals
    // means a real person has used the account, and only they may consent —
    // letting an advisor attest here would run AI over a live user's policy
    // without genuine consent (GDPR).
    it("is blocked once the account has a password", () => {
        expect(deriveAiConsentState({ ...base, password: "hash" })).toBe("blocked")
    })

    it("is blocked once the email is verified", () => {
        expect(
            deriveAiConsentState({ ...base, emailVerified: new Date("2026-01-01") })
        ).toBe("blocked")
    })

    it("is blocked once the user has ever been active", () => {
        expect(
            deriveAiConsentState({ ...base, lastActiveAt: new Date("2026-01-01") })
        ).toBe("blocked")
    })

    it("prefers granted over blocked when a live account HAS consented", () => {
        expect(
            deriveAiConsentState({
                ...base,
                aiProcessingConsentVersion: "v2",
                lastActiveAt: new Date("2026-01-01"),
                emailVerified: new Date("2026-01-01"),
            })
        ).toBe("granted")
    })
})
