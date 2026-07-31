/**
 * WP-15 — someone is paged when AI spend departs from its own normal.
 *
 * Every pre-existing incident rule watched FAILURE ratios. Nothing watched
 * cost. A runaway loop, a pricing change or a switch to a pricier model is not
 * a failure — it completes successfully and simply bills more, so it could run
 * for a whole billing period unnoticed.
 *
 * The comparison is against the deployment's own trailing week, so it needs no
 * configured budget and adapts as real traffic grows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const aggregate = vi.fn()
const dispatched: unknown[] = []

vi.mock("@/lib/db", () => ({
    db: { tokenUsage: { aggregate: (...a: unknown[]) => aggregate(...a) } },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

// Intercept at the transport boundary: the adapters need real secrets and the
// point here is which conditions DECIDE to alert.
vi.mock("@upstash/qstash", () => ({ Client: class {}, Receiver: class {} }))

async function loadFresh() {
    vi.resetModules()
    dispatched.length = 0
    const mod = await import("@/lib/services/analysis/incident-dispatcher")
    return mod
}

/** last hour EUR, previous-7-days EUR */
function mockSpend(hourEur: number, weekEur: number) {
    aggregate
        .mockResolvedValueOnce({ _sum: { costEur: hourEur } })
        .mockResolvedValueOnce({ _sum: { costEur: weekEur } })
}

beforeEach(() => {
    vi.clearAllMocks()
    process.env.AI_INCIDENT_SLACK_WEBHOOK_URL = ""
    process.env.AI_INCIDENT_PAGERDUTY_ROUTING_KEY = ""
})

describe("evaluateSpendSpike", () => {
    it("alerts when the last hour is several times the weekly hourly mean", async () => {
        // 167 hourly baseline over the week; 900 in the last hour is ~5.4x.
        mockSpend(900, 28_000)
        const { evaluateSpendSpike } = await loadFresh()
        const logger = (await import("@/lib/logger")).logger as ReturnType<typeof vi.fn>

        await evaluateSpendSpike()

        expect(logger).toHaveBeenCalledWith(
            "error",
            "AI spend spike detected",
            expect.objectContaining({ incidentEvent: "AI_SPEND_SPIKE" })
        )
    })

    it("stays quiet when the hour is in line with the baseline", async () => {
        mockSpend(180, 28_000)
        const { evaluateSpendSpike } = await loadFresh()
        const logger = (await import("@/lib/logger")).logger as ReturnType<typeof vi.fn>

        await evaluateSpendSpike()

        expect(logger).not.toHaveBeenCalledWith("error", "AI spend spike detected", expect.anything())
    })

    it("ignores a large multiple on a trivially small absolute amount", async () => {
        // 0.30 EUR against a near-zero baseline is a huge multiple and no news.
        mockSpend(0.3, 1)
        const { evaluateSpendSpike } = await loadFresh()
        const logger = (await import("@/lib/logger")).logger as ReturnType<typeof vi.fn>

        await evaluateSpendSpike()

        expect(logger).not.toHaveBeenCalledWith("error", "AI spend spike detected", expect.anything())
    })

    it("does not page on the first busy hour of a deployment with no history", async () => {
        // Zero baseline would otherwise divide by ~zero and alert forever.
        mockSpend(500, 0)
        const { evaluateSpendSpike } = await loadFresh()
        const logger = (await import("@/lib/logger")).logger as ReturnType<typeof vi.fn>

        await evaluateSpendSpike()

        expect(logger).not.toHaveBeenCalledWith("error", "AI spend spike detected", expect.anything())
    })

    it("holds a cooldown so one bad hour does not page repeatedly", async () => {
        const { evaluateSpendSpike } = await loadFresh()
        const logger = (await import("@/lib/logger")).logger as ReturnType<typeof vi.fn>

        mockSpend(900, 28_000)
        await evaluateSpendSpike()
        mockSpend(900, 28_000)
        await evaluateSpendSpike()

        const alerts = logger.mock.calls.filter((c) => c[1] === "AI spend spike detected")
        expect(alerts).toHaveLength(1)
    })
})
