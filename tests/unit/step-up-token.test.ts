import { describe, it, expect, beforeAll } from "vitest"

import { STEP_UP_TTL_SECONDS, issueStepUpToken, verifyStepUpToken } from "@/lib/auth/step-up"

/**
 * PW-PROVENANCE-01 R-01. The step-up proof is a signed cookie; these pin what
 * makes it unforgeable: the signature, the user binding, the expiry, the shape.
 */
beforeAll(() => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-step-up"
})

const NOW = new Date("2026-09-12T10:00:00Z")

describe("the step-up token", () => {
    it("verifies for the user it was issued to, within its TTL", async () => {
        const token = await issueStepUpToken("user-1", NOW)
        expect(await verifyStepUpToken(token, "user-1", NOW)).toBe(true)
        expect(await verifyStepUpToken(token, "user-1", new Date(NOW.getTime() + (STEP_UP_TTL_SECONDS - 1) * 1000))).toBe(true)
    })

    it("is bound to the user: another user's id is rejected", async () => {
        const token = await issueStepUpToken("user-1", NOW)
        expect(await verifyStepUpToken(token, "user-2", NOW)).toBe(false)
    })

    it("expires: one second past the TTL is rejected", async () => {
        const token = await issueStepUpToken("user-1", NOW)
        expect(await verifyStepUpToken(token, "user-1", new Date(NOW.getTime() + STEP_UP_TTL_SECONDS * 1000))).toBe(false)
    })

    it("a tampered expiry, user, nonce or signature is rejected; so is any malformed shape", async () => {
        const token = await issueStepUpToken("user-1", NOW)
        const [user, exp, nonce, sig] = token.split(".")
        expect(await verifyStepUpToken(`${user}.${Number(exp) + 3600}.${nonce}.${sig}`, "user-1", NOW)).toBe(false)
        expect(await verifyStepUpToken(`user-2.${exp}.${nonce}.${sig}`, "user-2", NOW)).toBe(false)
        expect(await verifyStepUpToken(`${user}.${exp}.${nonce}x.${sig}`, "user-1", NOW)).toBe(false)
        expect(await verifyStepUpToken(`${user}.${exp}.${nonce}.${sig.slice(0, -2)}AA`, "user-1", NOW)).toBe(false)
        for (const bad of ["", "a.b.c", "a.b.c.d.e", token + ".x", null, undefined]) {
            expect(await verifyStepUpToken(bad as string, "user-1", NOW), String(bad)).toBe(false)
        }
    })

    it("a token signed under another secret is rejected", async () => {
        const token = await issueStepUpToken("user-1", NOW)
        const saved = process.env.AUTH_SECRET
        process.env.AUTH_SECRET = "a-different-secret"
        try {
            expect(await verifyStepUpToken(token, "user-1", NOW)).toBe(false)
        } finally {
            process.env.AUTH_SECRET = saved
        }
    })

    it("probe — a token that skips the signature check would verify with a forged signature", async () => {
        // What the real verifier refuses: the same fields, any signature.
        const token = await issueStepUpToken("user-1", NOW)
        const forged = token.replace(/\.[^.]+$/, ".forged")
        expect(await verifyStepUpToken(forged, "user-1", NOW)).toBe(false)
    })
})
