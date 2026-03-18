import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/logger", () => ({
    logger: vi.fn(),
}))

import { logger } from "@/lib/logger"
import {
    emitAnalysisRunTelemetry,
    emitAnalysisStepTelemetry,
} from "@/lib/services/analysis/step-telemetry"

describe("analysis telemetry emitters", () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it("emits step telemetry and metric events on successful completion", () => {
        emitAnalysisStepTelemetry({
            status: "completed",
            runId: "run-1",
            policyId: "policy-1",
            stepKey: "gap_detection",
            attempt: 2,
            provider: "openai",
            remediationType: "provider_failover",
            model: "gpt-4.1-mini",
            durationMs: 350,
            successPct: 92,
            tokens: {
                inputTokens: 120,
                outputTokens: 80,
                totalTokens: 200,
            },
        })

        const loggerMock = vi.mocked(logger)
        expect(loggerMock).toHaveBeenCalledWith(
            "info",
            "AI analysis step telemetry",
            expect.objectContaining({
                status: "completed",
                stepKey: "gap_detection",
                provider: "openai",
                remediationType: "provider_failover",
                durationMs: 350,
            })
        )

        const metricCalls = loggerMock.mock.calls.filter((call) => call[1] === "AI analysis metric")
        expect(metricCalls.length).toBeGreaterThanOrEqual(3)
    })

    it("emits run-level telemetry including failover/degraded indicators", () => {
        emitAnalysisRunTelemetry({
            runId: "run-2",
            policyId: "policy-2",
            status: "completed_with_warnings",
            provider: "gemini",
            failoverUsed: true,
            degradedCompletion: true,
            degradedSteps: ["gap_detection"],
            overallSuccessPct: 81,
            actualTotalTokens: 700,
            durationMs: 1450,
            failureCode: "SCHEMA_MISMATCH",
        })

        const loggerMock = vi.mocked(logger)
        expect(loggerMock).toHaveBeenCalledWith(
            "info",
            "AI analysis run telemetry",
            expect.objectContaining({
                status: "completed_with_warnings",
                failoverUsed: true,
                degradedCompletion: true,
            })
        )

        const metricCalls = loggerMock.mock.calls.filter((call) => call[1] === "AI analysis metric")
        expect(metricCalls.some((call) => (call[2] as Record<string, unknown>).metric === "ai_analysis_failover_used")).toBe(true)
        expect(metricCalls.some((call) => (call[2] as Record<string, unknown>).metric === "ai_analysis_degraded_completion")).toBe(true)
    })
})
