/**
 * WP-13 — a FIRST analysis must go through the durable queue.
 *
 * It used to run inline inside a server action's `after()`. Server actions get
 * no `maxDuration`, so they execute under the platform default (~10-15s) while
 * a single AI call is allowed up to 180s and a run makes several — at volume
 * the executor was killed mid-flight and the policy sat 'analyzing' until a
 * reaper noticed. The three RE-RUN paths already enqueued; only the first
 * analysis, the one every user hits, did not.
 *
 * Two properties are pinned here, because getting either wrong reintroduces a
 * bug that is invisible until production load:
 *   1. when the queue accepts the run, nothing executes inline;
 *   2. the enqueue asks the consumer to finalize — otherwise moving to the
 *      queue silently drops dedup/merge, the 'active' transition and the
 *      completion notification for every first analysis.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const enqueueAnalysisRun = vi.fn()
const createRun = vi.fn()
const executeRun = vi.fn()
const getRunStatus = vi.fn()
const finalizeAnalysis = vi.fn()

vi.mock("@/lib/services/analysis/analysis-queue", () => ({
    enqueueAnalysisRun: (...args: unknown[]) => enqueueAnalysisRun(...args),
}))

vi.mock("@/lib/services/analysis/policy-analysis-orchestrator.service", () => ({
    PolicyAnalysisOrchestratorService: class {
        createRun = (...args: unknown[]) => createRun(...args)
        executeRun = (...args: unknown[]) => executeRun(...args)
        getRunStatus = (...args: unknown[]) => getRunStatus(...args)
        extractBasicSummary = vi.fn()
    },
}))

vi.mock("@/lib/journey/conversion-events", () => ({
    recordConversionEvent: vi.fn(),
}))

vi.mock("@/lib/subscription-entitlements", () => ({
    // "pro" is the Plus tier code — the only one that runs the deep pipeline.
    resolveUserEntitlements: vi.fn(async () => ({ tier: "pro", limits: {} })),
}))

vi.mock("@/lib/db", () => ({
    db: {
        user: { findUnique: vi.fn(async () => ({ roles: "policyholder" })) },
        policy: { findUnique: vi.fn(async () => null), update: vi.fn() },
        policyDocument: { updateMany: vi.fn() },
        policyAnalysisRun: { findUnique: vi.fn() },
        notificationEvent: { create: vi.fn() },
    },
}))

vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

// policy.service pulls in lib/storage -> lib/env, which parses the real
// process.env at module load. The suite does not carry those secrets.
vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-test",
        GEMINI_MODEL_EXTRACTION: "gemini-test",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-test",
        GEMINI_MODEL_QA: "gemini-test",
        GEMINI_MODEL_FALLBACK: "gemini-test",
        FF_AI_FAILOVER_OPENAI: "false",
        FF_AI_DEGRADED_COMPLETION: "true",
    },
}))

async function serviceUnderTest() {
    const { PolicyService } = await import("@/lib/services/policy.service")
    const service = new PolicyService()
    // finalizeAnalysis has its own extensive coverage; here we only care THAT
    // the inline path calls it and the queued path does not.
    ;(service as unknown as Record<string, unknown>).finalizeAnalysis = finalizeAnalysis
    return service
}

beforeEach(() => {
    vi.clearAllMocks()
    createRun.mockResolvedValue({ id: "run-1", status: "queued" })
    getRunStatus.mockResolvedValue({ id: "run-1", status: "completed" })
})

describe("first analysis execution path", () => {
    it("hands the run to the queue instead of executing it inline", async () => {
        enqueueAnalysisRun.mockResolvedValue(true)
        const service = await serviceUnderTest()

        await service.runBackgroundAnalysis("policy-1", "user-1", "el")

        expect(enqueueAnalysisRun).toHaveBeenCalledTimes(1)
        expect(executeRun).not.toHaveBeenCalled()
    })

    it("asks the consumer to finalize, so post-analysis work is not dropped", async () => {
        enqueueAnalysisRun.mockResolvedValue(true)
        const service = await serviceUnderTest()

        await service.runBackgroundAnalysis("policy-1", "user-1", "el")

        expect(enqueueAnalysisRun).toHaveBeenCalledWith("run-1", "el", { finalize: true })
    })

    it("does not finalize inline when the queue took ownership", async () => {
        enqueueAnalysisRun.mockResolvedValue(true)
        const service = await serviceUnderTest()

        await service.runBackgroundAnalysis("policy-1", "user-1", "el")

        // Finalizing here as well would double-notify and re-run merge detection.
        expect(finalizeAnalysis).not.toHaveBeenCalled()
    })

    it("falls back to inline execution when no queue is configured", async () => {
        enqueueAnalysisRun.mockResolvedValue(false)
        const service = await serviceUnderTest()

        await service.runBackgroundAnalysis("policy-1", "user-1", "el")

        expect(executeRun).toHaveBeenCalledWith("run-1", "el")
        expect(finalizeAnalysis).toHaveBeenCalledTimes(1)
    })

    it("never enqueues or executes a run the gate already blocked", async () => {
        createRun.mockResolvedValue({ id: "run-blocked", status: "blocked" })
        getRunStatus.mockResolvedValue({ id: "run-blocked", status: "blocked" })
        const service = await serviceUnderTest()

        await service.runBackgroundAnalysis("policy-1", "user-1", "el")

        expect(enqueueAnalysisRun).not.toHaveBeenCalled()
        expect(executeRun).not.toHaveBeenCalled()
    })
})
