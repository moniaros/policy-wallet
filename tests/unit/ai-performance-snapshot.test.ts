/**
 * AI performance snapshot contract.
 *
 * Pins the payload shape and the derived metrics (success rate, degraded count,
 * p50/p95 latency math, guardrail attack-pressure counts) against a mocked
 * Prisma, plus a source-level assertion that the API route is admin-guarded via
 * the mandated requireApiUser (not the older inline-roles style).
 */

import { describe, it, expect, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// vi.mock is hoisted above const declarations, so define the spies via
// vi.hoisted to avoid the temporal-dead-zone reference in the factory.
const { groupBy, aggregate, findMany } = vi.hoisted(() => ({
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
    db: {
        policyAnalysisRun: { groupBy, aggregate },
        policyAnalysisStep: { groupBy, findMany },
        tokenUsage: { groupBy },
        activityLog: { groupBy },
    },
}))
vi.mock("@/lib/token-tracking", () => ({
    getDailyUsageTrends: vi.fn(async () => [
        { date: new Date("2026-07-29T00:00:00Z"), tokens: 1000, cost: 0.5, operations: 3 },
    ]),
}))

import { getAiPerformanceSnapshot } from "@/lib/services/ops/ai-performance.service"

/**
 * The service fires many groupBy/aggregate/findMany calls in one Promise.all.
 * Drive them by matching on the query args each call carries.
 */
function wireMocks() {
    groupBy.mockImplementation((args: any) => {
        // run status
        if (args.by?.includes("status")) {
            return Promise.resolve([
                { status: "completed", _count: { _all: 8 } },
                { status: "completed_with_warnings", _count: { _all: 1 } },
                { status: "failed", _count: { _all: 1 } },
                { status: "blocked", _count: { _all: 2 } },
            ])
        }
        if (args.by?.includes("failureCode")) {
            return Promise.resolve([{ failureCode: "AI_UNAVAILABLE", _count: { _all: 1 } }])
        }
        if (args.by?.includes("errorCode")) {
            return Promise.resolve([{ errorCode: "schema", _count: { _all: 2 } }])
        }
        if (args.by?.includes("remediationType")) {
            return Promise.resolve([{ remediationType: "provider_failover", provider: "anthropic", _count: { _all: 1 } }])
        }
        if (args.by?.includes("operationType") && args.by?.includes("model")) {
            return Promise.resolve([{ model: "gemini-3.1-flash-lite", operationType: "qa_session", _count: { _all: 5 } }])
        }
        if (args.by?.includes("operationType")) {
            return Promise.resolve([{ operationType: "qa_session", _sum: { totalTokens: 5000, costEur: 0.25 }, _count: { _all: 5 } }])
        }
        if (args.by?.includes("actionType")) {
            return Promise.resolve([
                { actionType: "AI_INPUT_REJECTED", _count: { _all: 4 } },
                { actionType: "AI_INPUT_FLAGGED", _count: { _all: 2 } },
            ])
        }
        return Promise.resolve([])
    })
    aggregate.mockResolvedValue({ _avg: { actualTotalTokens: 4321 } })
    findMany.mockResolvedValue([
        { stepKey: "gap_detection", startedAt: new Date(0), finishedAt: new Date(1000) },
        { stepKey: "gap_detection", startedAt: new Date(0), finishedAt: new Date(3000) },
        { stepKey: "gap_detection", startedAt: new Date(0), finishedAt: new Date(9000) },
    ])
}

describe("getAiPerformanceSnapshot", () => {
    it("derives run stats: success rate excludes blocked, degraded counted", async () => {
        wireMocks()
        const s = await getAiPerformanceSnapshot({ windowHours: 24 })
        expect(s.runs.total).toBe(12)
        expect(s.runs.blocked).toBe(2)
        expect(s.runs.degraded).toBe(1)
        // completed (8 + 1 degraded) / non-blocked (10) = 90%
        expect(s.runs.successRatePct).toBe(90)
        expect(s.runs.avgActualTotalTokens).toBe(4321)
    })

    it("computes p50/p95 step latency in TS", async () => {
        wireMocks()
        const s = await getAiPerformanceSnapshot({})
        const gap = s.stepLatency.find((l) => l.stepKey === "gap_detection")
        expect(gap?.samples).toBe(3)
        // sorted [1000, 3000, 9000]: p50 -> index 1 (3000), p95 -> last (9000)
        expect(gap?.p50Ms).toBe(3000)
        expect(gap?.p95Ms).toBe(9000)
    })

    it("surfaces routing distribution and cost per operation", async () => {
        wireMocks()
        const s = await getAiPerformanceSnapshot({})
        expect(s.routing[0]).toMatchObject({ model: "gemini-3.1-flash-lite", operationType: "qa_session", calls: 5 })
        expect(s.cost.byOperation[0]).toMatchObject({ operationType: "qa_session", totalTokens: 5000, calls: 5 })
        expect(s.cost.totalCostEur).toBeCloseTo(0.25)
    })

    it("reports guardrail attack pressure from the audit log", async () => {
        wireMocks()
        const s = await getAiPerformanceSnapshot({})
        expect(s.guardrail.blockedInputs).toBe(4)
        expect(s.guardrail.flaggedInputs).toBe(2)
    })

    it("includes the token spend trend", async () => {
        wireMocks()
        const s = await getAiPerformanceSnapshot({})
        expect(s.trend[0]).toMatchObject({ date: "2026-07-29", tokens: 1000 })
    })
})

describe("the /api/admin/ai-performance route is admin-guarded", () => {
    const src = readFileSync(join(process.cwd(), "app/api/admin/ai-performance/route.ts"), "utf8")
    it("uses requireApiUser with the admin role, not an inline roles.includes check", () => {
        expect(src).toMatch(/requireApiUser\(\{\s*roles:\s*\["admin"\]\s*\}\)/)
        expect(src).not.toMatch(/roles\?\.includes\(['"]admin['"]\)/)
    })
})
