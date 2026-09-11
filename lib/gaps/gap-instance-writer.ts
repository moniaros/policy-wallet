import type { Prisma } from "@prisma/client"
import { documentEvidenceForLogic } from "@/lib/gaps/document-evidence"
import { db } from "@/lib/db"
import { GAP_ENGINE_VERSION, hasEvaluableRule } from "@/lib/gap-detection"
import { fingerprintGapDefinitions } from "@/lib/gaps/catalogue-version"

/**
 * THE writer of `gap_instances`. Nothing else creates a row.
 *
 * Until Sept 2026 two engines wrote this table: the orchestrator (rule-decided,
 * delete-and-recreate) and a legacy path (`detectGapsForPolicy` +
 * `createGapInstances`) still reachable from the protection refresh action and
 * the process-policy job — no provenance, and it RE-ACTIVATED dismissed rows.
 * A denominator computed over that table had no defined referent, and any
 * per-row confirmation state written against it could be silently resurrected.
 * `tests/unit/gap-instance-single-writer.test.ts` enumerates every write call
 * in the tree and fails on a second one.
 *
 * Semantics (PW-TRANSPARENCY-02 amendment 01, B0.1 / B0.2):
 *   - A finding is attributed to the RUN that produced it, the branch it was
 *     evaluated for and the catalogue version it was evaluated against.
 *   - A later run never deletes or reactivates a row. Every live row of the
 *     policy is SUPERSEDED (its prior status kept), and the run's findings are
 *     written as new rows. A rule that fires, resolves and fires again is two
 *     rows. Confirmation state cannot be inherited across runs.
 *   - This module decides nothing about detection or severity. It writes what
 *     `decideGapsForPolicy` (lib/gap-detection.ts, untouched) decided.
 */
export const GAP_INSTANCE_WRITER_MODULE = "lib/gaps/gap-instance-writer.ts"

/** The status a row takes when a later run replaces it. */
export const SUPERSEDED_GAP_STATUS = "superseded"

/** Statuses a reader may treat as a current, live finding. */
export const LIVE_GAP_STATUSES = ["open", "detected", "acknowledged"] as const

export interface AttemptedRules {
    /** `planned` at run creation (declared branch); `evaluated` once the rules ran (final branch). */
    phase: "planned" | "evaluated"
    lineOfBusiness: string
    catalogueVersion: string
    engineVersion: string
    /** Slugs of the active, evaluable definitions for the branch — the denominator. */
    slugs: string[]
    /** Slugs the rules decided, once evaluated. */
    decidedSlugs?: string[]
    at: string
}

type DefinitionReader = {
    gapDefinition: {
        findMany: (args: {
            where: { isActive: boolean }
            select: {
                slug: true
                lineOfBusiness: true
                severity: true
                defaultSeverity: true
                ruleId: true
                detectionLogic: true
            }
        }) => Promise<
            Array<{
                slug: string
                lineOfBusiness: string
                severity: string
                defaultSeverity: string
                ruleId: string
                detectionLogic: unknown
            }>
        >
    }
}

/**
 * Which rules a run for this branch will attempt, and under which catalogue
 * version — recorded BEFORE evaluation so it survives a failed run.
 */
export async function planAttemptedRules(
    lineOfBusiness: string,
    client: DefinitionReader = db as unknown as DefinitionReader
): Promise<AttemptedRules> {
    const active = await client.gapDefinition.findMany({
        where: { isActive: true },
        select: {
            slug: true,
            lineOfBusiness: true,
            severity: true,
            defaultSeverity: true,
            ruleId: true,
            detectionLogic: true,
        },
    })
    const branch = String(lineOfBusiness || "").trim()
    const slugs = active
        .filter((row) => row.lineOfBusiness === branch && hasEvaluableRule(row as { detectionLogic: unknown } as any))
        .map((row) => row.slug)
        .sort()
    return {
        phase: "planned",
        lineOfBusiness: branch,
        catalogueVersion: fingerprintGapDefinitions(active),
        engineVersion: GAP_ENGINE_VERSION,
        slugs,
        at: new Date().toISOString(),
    }
}

export interface DecidedGapRowInput {
    gapDefinitionId: string
    severity: string
    ruleId: string
    ruleInputs: unknown
    aiExplanation: string | null
    aiExplanationEl: string | null
    aiSuggestion: string | null
    aiSuggestionEl: string | null
}

export interface WriteRuleDecidedGapsParams {
    policyId: string
    runId: string
    lineOfBusiness: string
    catalogueVersion: string
    decided: DecidedGapRowInput[]
    now?: Date
    /**
     * The extracted document the rules were evaluated against (W2-01). When
     * given, every row's `ruleInputs` gains `_evidence` — what the document
     * was evidence OF for each field the rule read, plus the weakest — from
     * `lib/gaps/document-evidence.ts`. Absent: rows are written as before.
     */
    acordData?: unknown
}

type WriterClient = Pick<Prisma.TransactionClient, "gapInstance" | "gapDefinition">

/**
 * Supersede the policy's live rows and write this run's findings.
 *
 * Call inside the transaction that also marks the run complete, so a run and
 * its rows land together or not at all.
 */
export async function writeRuleDecidedGaps(
    tx: WriterClient,
    params: WriteRuleDecidedGapsParams
): Promise<{ superseded: number; written: number }> {
    const now = params.now ?? new Date()

    // W2-01: the logic each decided definition read, so the evidence is
    // computed against the same fields the rule looked at. One query, by id.
    const logicById = new Map<string, unknown>()
    if (params.acordData !== undefined && params.decided.length > 0) {
        const defs = await tx.gapDefinition.findMany({
            where: { id: { in: [...new Set(params.decided.map((d) => d.gapDefinitionId))] } },
            select: { id: true, detectionLogic: true },
        })
        for (const def of defs) logicById.set(def.id, def.detectionLogic)
    }

    const live = await tx.gapInstance.findMany({
        where: { policyId: params.policyId, supersededAt: null },
        select: { id: true, status: true },
    })

    // Group by prior status so it is preserved on the row it belonged to.
    const byStatus = new Map<string, string[]>()
    for (const row of live) {
        const ids = byStatus.get(row.status) ?? []
        ids.push(row.id)
        byStatus.set(row.status, ids)
    }
    let superseded = 0
    for (const [priorStatus, ids] of byStatus) {
        const result = await tx.gapInstance.updateMany({
            where: { id: { in: ids } },
            data: {
                supersededAt: now,
                supersededByRunId: params.runId,
                priorStatus,
                status: SUPERSEDED_GAP_STATUS,
            },
        })
        superseded += result.count
    }

    const seen = new Set<string>()
    const rows: Prisma.GapInstanceCreateManyInput[] = []
    for (const d of params.decided) {
        if (seen.has(d.gapDefinitionId)) continue
        seen.add(d.gapDefinitionId)
        rows.push({
            policyId: params.policyId,
            gapDefinitionId: d.gapDefinitionId,
            severity: d.severity,
            status: "open",
            aiExplanation: d.aiExplanation,
            aiExplanationEl: d.aiExplanationEl,
            aiSuggestion: d.aiSuggestion,
            aiSuggestionEl: d.aiSuggestionEl,
            detectedAt: now,
            ruleId: d.ruleId,
            ruleInputs: withDocumentEvidence(d.ruleInputs, logicById.get(d.gapDefinitionId), params.acordData) as Prisma.InputJsonValue,
            engineVersion: GAP_ENGINE_VERSION,
            analysisRunId: params.runId,
            lineOfBusiness: params.lineOfBusiness,
            catalogueVersion: params.catalogueVersion,
        })
    }
    if (rows.length > 0) {
        await tx.gapInstance.createMany({ data: rows })
    }
    return { superseded, written: rows.length }
}

/**
 * The inputs the rule read, plus — additively, under one reserved key — what
 * the document was evidence of for each (W2-01). Rows written before this key
 * exist; nothing reads `ruleInputs` by key (enumerated 2026-09-12).
 */
function withDocumentEvidence(ruleInputs: unknown, detectionLogic: unknown, acordData: unknown): unknown {
    if (acordData === undefined || detectionLogic === undefined) return ruleInputs
    const { evidence, lowest } = documentEvidenceForLogic(detectionLogic, acordData)
    const base = ruleInputs && typeof ruleInputs === "object" && !Array.isArray(ruleInputs) ? (ruleInputs as Record<string, unknown>) : {}
    return { ...base, _evidence: { ...evidence, lowest } }
}
