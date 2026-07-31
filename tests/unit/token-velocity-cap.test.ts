/**
 * WP-15 — spending is bounded by RATE, not only by month.
 *
 * Token budgets were monthly only. A Plus user could burn a 3M-token month in
 * minutes, and a plan with a null budget — which admins can set from the plan
 * editor — had no ceiling at all. A monthly cap bounds the bill; it does not
 * bound a runaway loop, a stolen session or a script.
 *
 * The gate is deliberately DB-backed. Production runs with
 * RATELIMIT_ALLOW_LOCAL=1 and no Upstash, so a Redis-backed limiter degrades to
 * a per-instance counter and effectively vanishes at scale; counting the user's
 * own TokenUsage rows is instance-independent by construction.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const aggregate = vi.fn()

vi.mock("@/lib/db", () => ({
    db: { tokenUsage: { aggregate: (...a: unknown[]) => aggregate(...a) } },
    prisma: { tokenUsage: { aggregate: (...a: unknown[]) => aggregate(...a) } },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

beforeEach(() => {
    vi.clearAllMocks()
})

describe("hourlyTokenCeiling", () => {
    it("gives an unlimited plan a real ceiling instead of none", async () => {
        const { hourlyTokenCeiling } = await import("@/lib/token-tracking")
        const ceiling = hourlyTokenCeiling(null)

        expect(Number.isFinite(ceiling)).toBe(true)
        expect(ceiling).toBeGreaterThan(0)
    })

    it("spreads a monthly budget over at least ~10 hours of sustained use", async () => {
        const { hourlyTokenCeiling } = await import("@/lib/token-tracking")
        // 3M is the Plus monthly budget; it must not be drainable in one hour.
        expect(hourlyTokenCeiling(3_000_000)).toBeLessThan(3_000_000)
        expect(hourlyTokenCeiling(3_000_000)).toBe(300_000)
    })

    it("keeps a floor so small plans stay usable in one sitting", async () => {
        const { hourlyTokenCeiling } = await import("@/lib/token-tracking")
        expect(hourlyTokenCeiling(200_000)).toBe(100_000)
    })
})

describe("checkTokenVelocity", () => {
    it("allows a request that fits inside the hourly ceiling", async () => {
        aggregate.mockResolvedValue({ _sum: { totalTokens: 50_000 } })
        const { checkTokenVelocity } = await import("@/lib/token-tracking")

        const result = await checkTokenVelocity("user-1", 10_000, 3_000_000)
        expect(result.allowed).toBe(true)
    })

    it("refuses a burst that would exceed the hourly ceiling", async () => {
        aggregate.mockResolvedValue({ _sum: { totalTokens: 299_000 } })
        const { checkTokenVelocity } = await import("@/lib/token-tracking")

        const result = await checkTokenVelocity("user-1", 10_000, 3_000_000)
        expect(result.allowed).toBe(false)
        if (!result.allowed) expect(result.reason).toBe("hourly_rate_exceeded")
    })

    it("still refuses an unlimited-budget user past the absolute ceiling", async () => {
        // The whole point: null budget no longer means unbounded velocity.
        aggregate.mockResolvedValue({ _sum: { totalTokens: 2_000_000 } })
        const { checkTokenVelocity } = await import("@/lib/token-tracking")

        const result = await checkTokenVelocity("user-1", 1, null)
        expect(result.allowed).toBe(false)
    })

    it("counts only the trailing hour, not all history", async () => {
        aggregate.mockResolvedValue({ _sum: { totalTokens: 0 } })
        const { checkTokenVelocity } = await import("@/lib/token-tracking")
        await checkTokenVelocity("user-1", 1, 3_000_000)

        const where = aggregate.mock.calls[0][0].where
        expect(where.userId).toBe("user-1")
        expect(where.createdAt.gte).toBeInstanceOf(Date)
        const windowMs = Date.now() - where.createdAt.gte.getTime()
        expect(windowMs).toBeGreaterThan(59 * 60 * 1000)
        expect(windowMs).toBeLessThan(61 * 60 * 1000)
    })

    it("treats an empty usage history as zero rather than failing open on NaN", async () => {
        aggregate.mockResolvedValue({ _sum: { totalTokens: null } })
        const { tokensUsedInLastHour } = await import("@/lib/token-tracking")

        expect(await tokensUsedInLastHour("user-1")).toBe(0)
    })
})
