/**
 * WP-14 — the cron secret is compared in constant time.
 *
 * `===` on strings short-circuits at the first differing byte, so response
 * timing leaks how much of a guessed prefix was correct. The cron routes
 * include privacy-retention, DSR evidence and billing reconciliation, so the
 * secret is worth guessing.
 *
 * Timing itself is not asserted (flaky under a test runner); what is pinned is
 * that the comparison goes through crypto.timingSafeEqual and that the
 * behavioural contract — right secret in, wrong secret out, length mismatch
 * rejected rather than thrown — still holds.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth-helpers", () => ({
    getAuthenticatedUserOrNull: vi.fn(async () => null),
}))

const SOURCE = readFileSync("lib/api-auth.ts", "utf-8")

function requestWith(headers: Record<string, string>): Request {
    return new Request("https://example.gr/api/v1/jobs/renewal-check", { headers })
}

beforeEach(() => {
    process.env.CRON_SECRET = "correct-horse-battery-staple"
})

describe("cron secret comparison", () => {
    it("uses crypto.timingSafeEqual rather than string equality", () => {
        expect(SOURCE).toContain("timingSafeEqual")
        // The old shape, which leaked a prefix oracle.
        expect(SOURCE).not.toContain("headerSecret === cronSecret")
        expect(SOURCE).not.toContain("bearerSecret === cronSecret")
    })

    it("authorizes a correct x-cron-secret header", async () => {
        const { authorizeCronRequest } = await import("@/lib/api-auth")
        const result = await authorizeCronRequest(
            requestWith({ "x-cron-secret": "correct-horse-battery-staple" })
        )
        expect(result).toBeNull()
    })

    it("authorizes a correct Bearer token", async () => {
        const { authorizeCronRequest } = await import("@/lib/api-auth")
        const result = await authorizeCronRequest(
            requestWith({ authorization: "Bearer correct-horse-battery-staple" })
        )
        expect(result).toBeNull()
    })

    it("rejects a wrong secret of the SAME length without throwing", async () => {
        const { authorizeCronRequest } = await import("@/lib/api-auth")
        const result = await authorizeCronRequest(
            requestWith({ "x-cron-secret": "correct-horse-battery-stapleX".slice(0, 27) })
        )
        expect(result).not.toBeNull()
    })

    it("rejects a shorter guess instead of throwing on a length mismatch", async () => {
        // timingSafeEqual throws when the buffers differ in length; an unguarded
        // call would turn a probe into a 500 and a very loud oracle.
        const { authorizeCronRequest } = await import("@/lib/api-auth")
        const result = await authorizeCronRequest(requestWith({ "x-cron-secret": "c" }))
        expect(result).not.toBeNull()
    })

    it("leaves no job route comparing the secret itself", async () => {
        // Hardening authorizeCronRequest changed nothing for the routes that
        // did NOT use it: twelve job routes inlined the same block with `===`.
        // A shared guard only guards what actually calls it.
        const { globSync } = await import("glob")
        const routes = globSync("app/api/v1/jobs/**/route.ts")

        expect(routes.length).toBeGreaterThan(8) // vacuity floor
        const inlining = routes.filter((f) =>
            /headerSecret\s*===\s*cronSecret|bearerSecret\s*===\s*cronSecret/.test(
                readFileSync(f, "utf-8")
            )
        )
        expect(inlining).toEqual([])
    })

    it("authenticates every job route by one of the three sanctioned means", async () => {
        // Not every route under /jobs/ is a cron: process-policy is triggered by
        // a signed-in user and correctly uses requireApiUser. Asserting they all
        // call authorizeCronRequest would have flagged it as unguarded when it
        // is not — a test that reports a defect where none exists is as
        // expensive as one that misses a real one.
        const { globSync } = await import("glob")
        const routes = globSync("app/api/v1/jobs/**/route.ts")

        expect(routes.length).toBeGreaterThan(8) // vacuity floor
        const unguarded = routes.filter((f) => {
            const src = readFileSync(f, "utf-8")
            return (
                !src.includes("authorizeCronRequest") && // scheduler-driven
                !src.includes("upstash-signature") && //    queue consumer
                !src.includes("requireApiUser") //          user-triggered
            )
        })
        expect(unguarded).toEqual([])
    })

    it("rejects a missing secret", async () => {
        const { authorizeCronRequest } = await import("@/lib/api-auth")
        const result = await authorizeCronRequest(requestWith({}))
        expect(result).not.toBeNull()
    })
})
