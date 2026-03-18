import type { AIServiceType } from "@/lib/services/ai"
import { logger } from "@/lib/logger"
import type { FailureClass } from "./failure-classifier"
import type { PolicyAnalysisStepKey } from "./token-budget-estimator"

type StepTelemetryStatus = "started" | "completed" | "failed"

type StepTelemetryEvent = {
    status: StepTelemetryStatus
    runId: string
    policyId: string
    stepKey: PolicyAnalysisStepKey
    attempt: number
    provider: AIServiceType
    remediationType: string
    model?: string
    durationMs?: number
    successPct?: number
    failureClass?: FailureClass
    failureCode?: string
    willRetry?: boolean
    tokens?: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }
}

type RunTelemetryStatus =
    | "queued"
    | "running"
    | "completed"
    | "completed_with_warnings"
    | "failed"
    | "blocked"

type RunTelemetryEvent = {
    runId: string
    policyId: string
    status: RunTelemetryStatus
    provider: AIServiceType
    failoverUsed: boolean
    degradedCompletion: boolean
    degradedSteps: string[]
    overallSuccessPct?: number
    actualTotalTokens?: number
    durationMs?: number
    failureCode?: string
}

function emitMetric(metric: string, value: number, dimensions: Record<string, unknown>) {
    logger("info", "AI analysis metric", {
        metric,
        value,
        ...dimensions,
    })
}

export function emitAnalysisStepTelemetry(event: StepTelemetryEvent) {
    const level = event.status === "failed" ? "warn" : "info"

    logger(level, "AI analysis step telemetry", {
        status: event.status,
        runId: event.runId,
        policyId: event.policyId,
        stepKey: event.stepKey,
        attempt: event.attempt,
        provider: event.provider,
        remediationType: event.remediationType,
        model: event.model || null,
        durationMs: event.durationMs,
        successPct: event.successPct,
        failureClass: event.failureClass || null,
        failureCode: event.failureCode || null,
        willRetry: event.willRetry ?? false,
        tokens: event.tokens || null,
    })

    if (event.status === "started") return

    emitMetric("ai_analysis_step_attempt_total", 1, {
        status: event.status,
        stepKey: event.stepKey,
        provider: event.provider,
        remediationType: event.remediationType,
        failureClass: event.failureClass || "none",
    })

    if (typeof event.durationMs === "number") {
        emitMetric("ai_analysis_step_latency_ms", event.durationMs, {
            status: event.status,
            stepKey: event.stepKey,
            provider: event.provider,
            remediationType: event.remediationType,
        })
    }

    if (event.tokens) {
        emitMetric("ai_analysis_step_total_tokens", event.tokens.totalTokens, {
            stepKey: event.stepKey,
            provider: event.provider,
            remediationType: event.remediationType,
        })
    }
}

export function emitAnalysisRunTelemetry(event: RunTelemetryEvent) {
    logger("info", "AI analysis run telemetry", {
        runId: event.runId,
        policyId: event.policyId,
        status: event.status,
        provider: event.provider,
        failoverUsed: event.failoverUsed,
        degradedCompletion: event.degradedCompletion,
        degradedSteps: event.degradedSteps,
        overallSuccessPct: event.overallSuccessPct,
        actualTotalTokens: event.actualTotalTokens,
        durationMs: event.durationMs,
        failureCode: event.failureCode || null,
    })

    emitMetric("ai_analysis_run_total", 1, {
        status: event.status,
        provider: event.provider,
    })

    emitMetric("ai_analysis_failover_used", event.failoverUsed ? 1 : 0, {
        status: event.status,
        provider: event.provider,
    })

    emitMetric("ai_analysis_degraded_completion", event.degradedCompletion ? 1 : 0, {
        status: event.status,
        provider: event.provider,
    })

    if (typeof event.durationMs === "number") {
        emitMetric("ai_analysis_run_latency_ms", event.durationMs, {
            status: event.status,
            provider: event.provider,
        })
    }

    if (typeof event.actualTotalTokens === "number") {
        emitMetric("ai_analysis_run_total_tokens", event.actualTotalTokens, {
            status: event.status,
            provider: event.provider,
        })
    }
}
