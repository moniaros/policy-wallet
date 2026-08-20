/**
 * Historical Analysis Comparison
 *
 * Compares two PolicyAnalysisRun results to produce a structured diff
 * showing what changed between analyses of the same policy.
 * Available to Plus+ tier users.
 */

import { db } from "@/lib/db"
import type { LocalizedText } from "../ai/ai-service.interface"

// ── Types ─────────────────────────────────────────────────────────────

export interface AnalysisComparisonResult {
    policyId: string
    baseRunId: string
    compareRunId: string
    baseRunDate: string
    compareRunDate: string
    overallScoreChange: number | null
    gapChanges: GapChange[]
    savingsChanges: SavingsChange[]
    coverageChanges: CoverageChange[]
    metadataChanges: MetadataChange[]
}

export interface GapChange {
    slug: string
    type: "new" | "resolved" | "unchanged"
    severity?: string
    explanation?: LocalizedText
}

export interface SavingsChange {
    action: LocalizedText
    type: "new" | "removed" | "unchanged"
    estimatedSavings: number | null
}

export interface CoverageChange {
    field: string
    type: "added" | "removed" | "unchanged"
    value?: string
}

export interface MetadataChange {
    field: string
    oldValue: string | null
    newValue: string | null
}

// ── Core comparison function ──────────────────────────────────────────

export async function compareAnalysisRuns(
    policyId: string,
    baseRunId: string,
    compareRunId: string
): Promise<AnalysisComparisonResult | null> {
    const [baseRun, compareRun] = await Promise.all([
        db.policyAnalysisRun.findFirst({
            where: { id: baseRunId, policyId },
            select: {
                id: true,
                overallSuccessPct: true,
                resultJson: true,
                finishedAt: true,
            },
        }),
        db.policyAnalysisRun.findFirst({
            where: { id: compareRunId, policyId },
            select: {
                id: true,
                overallSuccessPct: true,
                resultJson: true,
                finishedAt: true,
            },
        }),
    ])

    if (!baseRun?.resultJson || !compareRun?.resultJson) return null

    const baseResult = baseRun.resultJson as Record<string, any>
    const compareResult = compareRun.resultJson as Record<string, any>

    return {
        policyId,
        baseRunId,
        compareRunId,
        baseRunDate: baseRun.finishedAt?.toISOString() ?? "",
        compareRunDate: compareRun.finishedAt?.toISOString() ?? "",
        overallScoreChange:
            baseRun.overallSuccessPct != null && compareRun.overallSuccessPct != null
                ? compareRun.overallSuccessPct - baseRun.overallSuccessPct
                : null,
        gapChanges: diffGaps(baseResult, compareResult),
        savingsChanges: diffSavings(
            baseResult.savingsOpportunities,
            compareResult.savingsOpportunities
        ),
        coverageChanges: diffCoverage(
            baseResult.coverageSnapshot,
            compareResult.coverageSnapshot
        ),
        metadataChanges: diffMetadata(baseResult.metadata, compareResult.metadata),
    }
}

/**
 * Convenience: compare the two most recent completed runs for a policy.
 */
export async function compareLatestRuns(
    policyId: string
): Promise<AnalysisComparisonResult | null> {
    const runs = await db.policyAnalysisRun.findMany({
        where: {
            policyId,
            status: { in: ["completed", "completed_with_warnings"] },
        },
        orderBy: { finishedAt: "desc" },
        take: 2,
        select: { id: true },
    })

    if (runs.length < 2) return null
    return compareAnalysisRuns(policyId, runs[1].id, runs[0].id)
}

// ── Diff helpers ──────────────────────────────────────────────────────

/**
 * Which gaps changed between two runs.
 *
 * Reads `decidedGapSlugs` — the rule-decided set the orchestrator records on the
 * run. It must NOT read `gapResults`: that is AI prose keyed by slug, written for
 * candidate slugs whether or not a rule fired, so a slug appearing there is not a
 * finding. This previously filtered `gapResults` on an `isDetected` field that was
 * removed when rules took over detection, so every comparison reported no change.
 *
 * Runs analysed before `decidedGapSlugs` existed have no truthful detection set.
 * They yield no gap changes — the same output as before, but now because the data
 * is genuinely absent rather than because of a filter on a field that never matches.
 */
function diffGaps(
    baseResult: Record<string, any>,
    compareResult: Record<string, any>
): GapChange[] {
    const prose = new Map<string, any>(
        ([...(baseResult.gapResults ?? []), ...(compareResult.gapResults ?? [])] as any[]).map(
            (g) => [g.slug, g]
        )
    )
    const toGaps = (slugs: unknown) =>
        (Array.isArray(slugs) ? (slugs as string[]) : []).map((slug) => ({
            slug,
            severity: prose.get(slug)?.severity,
            explanation: prose.get(slug)?.explanation,
        }))

    const base = toGaps(baseResult.decidedGapSlugs)
    const compare = toGaps(compareResult.decidedGapSlugs)

    const baseSlugs = new Set(base.map((g: any) => g.slug))
    const compareSlugs = new Set(compare.map((g: any) => g.slug))

    const changes: GapChange[] = []

    for (const gap of compare) {
        if (!baseSlugs.has(gap.slug)) {
            changes.push({
                slug: gap.slug,
                type: "new",
                severity: gap.severity,
                explanation: gap.explanation,
            })
        }
    }

    for (const gap of base) {
        if (!compareSlugs.has(gap.slug)) {
            changes.push({ slug: gap.slug, type: "resolved" })
        }
    }

    for (const gap of compare) {
        if (baseSlugs.has(gap.slug)) {
            changes.push({ slug: gap.slug, type: "unchanged" })
        }
    }

    return changes
}

function diffSavings(
    baseSavings: any[] | undefined,
    compareSavings: any[] | undefined
): SavingsChange[] {
    const base = baseSavings ?? []
    const compare = compareSavings ?? []

    const baseActions = new Set(base.map((s: any) => actionKey(s.action)))
    const compareActions = new Set(compare.map((s: any) => actionKey(s.action)))

    const changes: SavingsChange[] = []

    for (const s of compare) {
        changes.push({
            action: s.action,
            type: baseActions.has(actionKey(s.action)) ? "unchanged" : "new",
            estimatedSavings: s.estimatedAnnualSavingsEur ?? null,
        })
    }

    for (const s of base) {
        if (!compareActions.has(actionKey(s.action))) {
            changes.push({
                action: s.action,
                type: "removed",
                estimatedSavings: s.estimatedAnnualSavingsEur ?? null,
            })
        }
    }

    return changes
}

function diffCoverage(
    baseCoverage: any | undefined,
    compareCoverage: any | undefined
): CoverageChange[] {
    if (!baseCoverage || !compareCoverage) return []

    const changes: CoverageChange[] = []

    const baseCovered = new Set<string>(baseCoverage.covered ?? [])
    const compareCovered = new Set<string>(compareCoverage.covered ?? [])

    for (const item of compareCovered) {
        if (!baseCovered.has(item)) {
            changes.push({ field: item, type: "added", value: item })
        }
    }

    for (const item of baseCovered) {
        if (!compareCovered.has(item)) {
            changes.push({ field: item, type: "removed", value: item })
        }
    }

    return changes
}

function diffMetadata(
    baseMeta: Record<string, any> | undefined,
    compareMeta: Record<string, any> | undefined
): MetadataChange[] {
    if (!baseMeta || !compareMeta) return []

    const fields = ["insurerName", "policyNumber", "premiumAmount", "startDate", "endDate"]
    const changes: MetadataChange[] = []

    for (const field of fields) {
        const oldVal = baseMeta[field] != null ? String(baseMeta[field]) : null
        const newVal = compareMeta[field] != null ? String(compareMeta[field]) : null
        if (oldVal !== newVal) {
            changes.push({ field, oldValue: oldVal, newValue: newVal })
        }
    }

    return changes
}

function actionKey(action: any): string {
    if (typeof action === "string") return action
    return action?.en || action?.el || JSON.stringify(action)
}
