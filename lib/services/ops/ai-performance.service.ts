/**
 * AI performance snapshot.
 *
 * Surfaces how the multi-model AI system is actually performing, from data
 * already persisted by the pipeline — no new schema. Feeds the /admin/ai
 * dashboard and the /api/admin/ai-performance route.
 *
 * Sources:
 *  - PolicyAnalysisRun   — success rate, degraded completions, failure-class mix,
 *                          cost/run, run volume.
 *  - PolicyAnalysisStep  — per-step latency (p50/p95), remediation/failover use,
 *                          step-level error codes.
 *  - TokenUsage          — cost per operation, routing distribution (which model
 *                          handled what), spend trend.
 *  - ActivityLog         — zero-cost guardrail activity (blocked / flagged
 *                          inputs), the attack-pressure signal from Phase 1.
 *
 * These are aggregate OPERATIONAL metrics, not an advice surface (see
 * docs/audits/ai-advice-compliance.md), so no AiDisclaimer is required — but the
 * dashboard must never render raw AI output text.
 */

import { db } from "@/lib/db"
import { getDailyUsageTrends } from "@/lib/token-tracking"

export interface AiPerformanceSnapshot {
    generatedAt: string
    windowHours: number
    runs: {
        total: number
        byStatus: Record<string, number>
        completed: number
        degraded: number
        failed: number
        blocked: number
        /** completed (incl. degraded) / non-blocked runs, as a percentage. */
        successRatePct: number | null
        avgActualTotalTokens: number | null
    }
    failureMix: Array<{ code: string; count: number }>
    stepErrorMix: Array<{ code: string; count: number }>
    remediation: Array<{ remediationType: string; provider: string; count: number }>
    stepLatency: Array<{ stepKey: string; p50Ms: number; p95Ms: number; samples: number }>
    cost: {
        byOperation: Array<{ operationType: string; totalTokens: number; costEur: number; calls: number }>
        totalCostEur: number
    }
    routing: Array<{ model: string; operationType: string; calls: number }>
    guardrail: {
        blockedInputs: number
        flaggedInputs: number
        rateLimited: number
        byAction: Array<{ actionType: string; count: number }>
    }
    trend: Array<{ date: string; tokens: number; cost: number; operations: number }>
}

/** actionTypes written by the Phase 1 zero-cost guardrail. */
const GUARDRAIL_ACTIONS = ["AI_INPUT_REJECTED", "AI_INPUT_FLAGGED"] as const

function percentile(sortedMs: number[], p: number): number {
    if (sortedMs.length === 0) return 0
    const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length))
    return sortedMs[idx]
}

export async function getAiPerformanceSnapshot(
    params: { windowHours?: number; trendDays?: number } = {}
): Promise<AiPerformanceSnapshot> {
    const windowHours = params.windowHours ?? 24
    const trendDays = params.trendDays ?? 30
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)

    const [
        runsByStatus,
        runAgg,
        failureGroups,
        stepErrorGroups,
        remediationGroups,
        stepRows,
        costByOperation,
        routingGroups,
        guardrailGroups,
        trend,
    ] = await Promise.all([
        db.policyAnalysisRun.groupBy({
            by: ["status"],
            where: { createdAt: { gte: since } },
            _count: { _all: true },
        }),
        db.policyAnalysisRun.aggregate({
            where: { createdAt: { gte: since } },
            _avg: { actualTotalTokens: true },
        }),
        db.policyAnalysisRun.groupBy({
            by: ["failureCode"],
            where: { createdAt: { gte: since }, failureCode: { not: null } },
            _count: { _all: true },
        }),
        db.policyAnalysisStep.groupBy({
            by: ["errorCode"],
            where: { createdAt: { gte: since }, errorCode: { not: null } },
            _count: { _all: true },
        }),
        db.policyAnalysisStep.groupBy({
            by: ["remediationType", "provider"],
            where: { createdAt: { gte: since }, remediationType: { not: null } },
            _count: { _all: true },
        }),
        db.policyAnalysisStep.findMany({
            where: { createdAt: { gte: since }, startedAt: { not: null }, finishedAt: { not: null } },
            select: { stepKey: true, startedAt: true, finishedAt: true },
            take: 10_000,
        }),
        db.tokenUsage.groupBy({
            by: ["operationType"],
            where: { createdAt: { gte: since } },
            _sum: { totalTokens: true, costEur: true },
            _count: { _all: true },
        }),
        db.tokenUsage.groupBy({
            by: ["model", "operationType"],
            where: { createdAt: { gte: since } },
            _count: { _all: true },
        }),
        db.activityLog.groupBy({
            by: ["actionType"],
            where: { timestamp: { gte: since }, actionType: { in: [...GUARDRAIL_ACTIONS] } },
            _count: { _all: true },
        }),
        getDailyUsageTrends(trendDays),
    ])

    const byStatus: Record<string, number> = {}
    for (const row of runsByStatus) byStatus[row.status] = row._count._all
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0)
    const completed = (byStatus.completed ?? 0) + (byStatus.completed_with_warnings ?? 0)
    const degraded = byStatus.completed_with_warnings ?? 0
    const failed = byStatus.failed ?? 0
    const blocked = byStatus.blocked ?? 0
    const nonBlocked = total - blocked
    const successRatePct = nonBlocked > 0 ? Math.round((completed / nonBlocked) * 100) : null

    // p50/p95 latency per step, computed in TS (Prisma has no percentile agg).
    const byStep = new Map<string, number[]>()
    for (const s of stepRows) {
        if (!s.startedAt || !s.finishedAt) continue
        const ms = s.finishedAt.getTime() - s.startedAt.getTime()
        if (ms < 0) continue
        const arr = byStep.get(s.stepKey) ?? []
        arr.push(ms)
        byStep.set(s.stepKey, arr)
    }
    const stepLatency = [...byStep.entries()]
        .map(([stepKey, arr]) => {
            const sorted = arr.sort((a, b) => a - b)
            return { stepKey, p50Ms: percentile(sorted, 50), p95Ms: percentile(sorted, 95), samples: sorted.length }
        })
        .sort((a, b) => b.p95Ms - a.p95Ms)

    const byOperation = costByOperation.map((r) => ({
        operationType: r.operationType,
        totalTokens: r._sum.totalTokens ?? 0,
        costEur: Number(r._sum.costEur ?? 0),
        calls: r._count._all,
    }))
    const totalCostEur = byOperation.reduce((a, b) => a + b.costEur, 0)

    const guardByAction: Record<string, number> = {}
    for (const g of guardrailGroups) guardByAction[g.actionType] = g._count._all

    return {
        generatedAt: new Date().toISOString(),
        windowHours,
        runs: {
            total,
            byStatus,
            completed,
            degraded,
            failed,
            blocked,
            successRatePct,
            avgActualTotalTokens:
                runAgg._avg.actualTotalTokens != null ? Math.round(runAgg._avg.actualTotalTokens) : null,
        },
        failureMix: failureGroups
            .map((f) => ({ code: f.failureCode ?? "unknown", count: f._count._all }))
            .sort((a, b) => b.count - a.count),
        stepErrorMix: stepErrorGroups
            .map((f) => ({ code: f.errorCode ?? "unknown", count: f._count._all }))
            .sort((a, b) => b.count - a.count),
        remediation: remediationGroups
            .map((r) => ({ remediationType: r.remediationType ?? "unknown", provider: r.provider ?? "unknown", count: r._count._all }))
            .sort((a, b) => b.count - a.count),
        stepLatency,
        cost: { byOperation, totalCostEur },
        routing: routingGroups
            .map((r) => ({ model: r.model, operationType: r.operationType, calls: r._count._all }))
            .sort((a, b) => b.calls - a.calls),
        guardrail: {
            blockedInputs: guardByAction.AI_INPUT_REJECTED ?? 0,
            flaggedInputs: guardByAction.AI_INPUT_FLAGGED ?? 0,
            rateLimited: 0,
            byAction: Object.entries(guardByAction).map(([actionType, count]) => ({ actionType, count })),
        },
        trend: trend.map((t) => ({
            date: t.date instanceof Date ? t.date.toISOString().slice(0, 10) : String(t.date),
            tokens: t.tokens,
            cost: t.cost,
            operations: t.operations,
        })),
    }
}
