import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

/**
 * The in-memory fallback is a PRODUCTION path, not a dev convenience: it is what
 * runs when Upstash is unconfigured or unreachable. Fluid Compute reuses an
 * instance across requests, so anything this module accumulates outlives the
 * request that created it.
 *
 * The failure being guarded is compounding: an unbounded map leaks precisely
 * when Redis is already down, so the degraded mode takes the instance with it.
 */

// No Upstash env → the fallback is the only path, which is the case under test.
vi.mock("@/lib/env", () => ({
    env: { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
}))
vi.mock("./env", () => ({
    env: { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
}))
vi.mock("@sentry/nextjs", () => ({
    captureMessage: vi.fn(),
    captureException: vi.fn(),
}))

async function loadRateLimit() {
    vi.resetModules()
    const mod = await import("@/lib/rate-limit")
    return mod.rateLimit
}

describe("the in-memory rate-limit fallback stays bounded", () => {
    let now = 1_700_000_000_000

    beforeEach(() => {
        now = 1_700_000_000_000
        vi.spyOn(Date, "now").mockImplementation(() => now)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("still enforces the limit it advertises", () => {
        // Bounding must not become "silently stops limiting".
        return loadRateLimit().then(async (rateLimit) => {
            let lastSuccess = true
            for (let i = 0; i < 6; i += 1) {
                const result = await rateLimit("1.2.3.4", 5, 60_000, "test:enforce")
                lastSuccess = result.success
            }
            expect(lastSuccess).toBe(false)
        })
    })

    it("does not grow without limit as unique keys arrive", async () => {
        const rateLimit = await loadRateLimit()

        // A bot sweep: 60k distinct source addresses, none ever seen again.
        // Before the fix every one of these was retained for the life of the
        // instance; the cap is 20k.
        for (let i = 0; i < 60_000; i += 1) {
            await rateLimit(`10.0.${(i >> 8) & 255}.${i & 255}`, 5, 60_000, `sweep:${i}`)
            // Advance past the sweep interval periodically so pruning engages
            // the way it would across a real traffic window.
            if (i % 10_000 === 0) now += 61_000
        }

        const { size } = await import("@/lib/rate-limit").then((m) => ({
            size: (m as any).__localCacheSize?.() ?? -1,
        }))

        // Exposed for this test only; if it is missing the assertion below is
        // what tells us, rather than a silently vacuous pass.
        expect(size).toBeGreaterThanOrEqual(0)
        expect(size).toBeLessThanOrEqual(20_000)
    })

    it("drops entries once their window has passed", async () => {
        const rateLimit = await loadRateLimit()
        const mod: any = await import("@/lib/rate-limit")

        for (let i = 0; i < 100; i += 1) {
            await rateLimit(`9.9.9.${i}`, 5, 1_000, `expiry:${i}`)
        }
        expect(mod.__localCacheSize()).toBeGreaterThan(0)

        // Every window has long closed; the next call sweeps them.
        now += 120_000
        await rateLimit("9.9.9.200", 5, 1_000, "expiry:trigger")

        // Only the key just written should remain.
        expect(mod.__localCacheSize()).toBeLessThanOrEqual(1)
    })
})
