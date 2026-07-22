"use server"

/**
 * Admin policy operations — requeue a stuck analysis, delete, edit key fields,
 * and merge duplicates — so support can resolve the top recurring incident
 * (policies stuck 'analyzing') and clean up bad/duplicate records in-app instead
 * of via SQL. All actions are admin-gated, zod-validated, return { ok, error },
 * and write a logAdminAction audit row.
 */

import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { db } from "@/lib/db"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import { enqueueAnalysisRun } from "@/lib/services/analysis/analysis-queue"
import { mergePolicyRecords } from "@/lib/services/policy-merge.service"
import { deleteFile } from "@/lib/storage"

export type PolicyActionResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; error: string }

export type AdminPolicyRow = {
    id: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    status: string
    ownerUserId: string
    ownerEmail: string | null
    premiumAmount: number | null
    startDate: string | null
    endDate: string | null
    createdAt: string
    lastAnalyzedAt: string | null
}

const listSchema = z.object({
    status: z.string().trim().optional(),
    search: z.string().trim().optional(),
    limit: z.number().int().positive().max(200).optional(),
})

export async function getPoliciesForAdmin(input: {
    status?: string
    search?: string
    limit?: number
}): Promise<{ policies: AdminPolicyRow[] }> {
    await verifyAdminRole()
    const parsed = listSchema.safeParse(input)
    const { status, search, limit } = parsed.success ? parsed.data : {}

    const rows = await db.policy.findMany({
        where: {
            ...(status ? { status } : {}),
            ...(search
                ? {
                      OR: [
                          { policyNumber: { contains: search, mode: "insensitive" } },
                          { insurerName: { contains: search, mode: "insensitive" } },
                          { owner: { email: { contains: search, mode: "insensitive" } } },
                      ],
                  }
                : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: limit ?? 50,
        select: {
            id: true,
            policyNumber: true,
            insurerName: true,
            lineOfBusiness: true,
            status: true,
            ownerUserId: true,
            premiumAmount: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            lastAnalyzedAt: true,
            owner: { select: { email: true } },
        },
    })

    return {
        policies: rows.map((p) => ({
            id: p.id,
            policyNumber: p.policyNumber,
            insurerName: p.insurerName,
            lineOfBusiness: p.lineOfBusiness,
            status: p.status,
            ownerUserId: p.ownerUserId,
            ownerEmail: p.owner?.email ?? null,
            premiumAmount: p.premiumAmount != null ? Number(p.premiumAmount) : null,
            startDate: p.startDate ? p.startDate.toISOString() : null,
            endDate: p.endDate ? p.endDate.toISOString() : null,
            createdAt: p.createdAt.toISOString(),
            lastAnalyzedAt: p.lastAnalyzedAt ? p.lastAnalyzedAt.toISOString() : null,
        })),
    }
}

/**
 * Unstick + re-analyze a policy: reap any orphaned run scoped to this policy
 * (graceMs 0 = now), then start a fresh run and enqueue it on the same QStash
 * path the wallet uses. The GDPR AI-consent gate in createRun still applies —
 * a run for an owner without consent comes back 'blocked' and is NOT queued.
 */
export async function requeuePolicy(policyId: string): Promise<PolicyActionResult<{ runId: string; queued: boolean }>> {
    const admin = await verifyAdminRole()
    if (!policyId || typeof policyId !== "string") return { ok: false, error: "Invalid policy id." }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { id: true, ownerUserId: true, status: true, owner: { select: { preferredLanguage: true } } },
    })
    if (!policy) return { ok: false, error: "Policy not found." }

    try {
        const { PolicyAnalysisOrchestratorService } = await import(
            "@/lib/services/analysis/policy-analysis-orchestrator.service"
        )
        const orchestrator = new PolicyAnalysisOrchestratorService()
        await orchestrator.reapStaleRuns({ graceMs: 0, policyIds: [policyId] })

        const run = await orchestrator.createRun(policyId, policy.ownerUserId)
        if ((run as { status?: string }).status === "blocked") {
            return { ok: false, error: "Owner has not granted AI-processing consent; cannot re-analyze." }
        }

        const language = policy.owner?.preferredLanguage === "en" ? "en" : "el"
        const queued = await enqueueAnalysisRun(run.id, language)

        await logAdminAction(
            admin.id,
            admin.email,
            "REQUEUE_POLICY",
            `Requeued analysis for policy ${policyId} (run ${run.id}, queued=${queued})`,
            { policyId, runId: run.id, queued, previousStatus: policy.status }
        )
        return { ok: true, runId: run.id, queued }
    } catch (error) {
        Sentry.captureException(error)
        return { ok: false, error: "Failed to requeue analysis." }
    }
}

/**
 * Hard-delete a policy. Every Policy child FK is Cascade or SetNull (verified in
 * schema), so db.policy.delete cascades cleanly; we best-effort remove the
 * Supabase document objects first (the DB cascade drops the rows but not the
 * storage bytes).
 */
export async function deletePolicy(policyId: string): Promise<PolicyActionResult> {
    const admin = await verifyAdminRole()
    if (!policyId || typeof policyId !== "string") return { ok: false, error: "Invalid policy id." }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { id: true, policyNumber: true, ownerUserId: true, documents: { select: { fileUrl: true } } },
    })
    if (!policy) return { ok: false, error: "Policy not found." }

    try {
        // Best-effort storage cleanup (deleteFile never throws on a miss).
        for (const doc of policy.documents) {
            if (doc.fileUrl) await deleteFile(doc.fileUrl)
        }
        await db.policy.delete({ where: { id: policyId } })

        await logAdminAction(
            admin.id,
            admin.email,
            "DELETE_POLICY",
            `Deleted policy ${policyId} (${policy.policyNumber})`,
            { policyId, policyNumber: policy.policyNumber, ownerUserId: policy.ownerUserId, documents: policy.documents.length }
        )
        return { ok: true }
    } catch (error) {
        Sentry.captureException(error)
        return { ok: false, error: "Failed to delete policy." }
    }
}

const updateSchema = z.object({
    insurerName: z.string().trim().min(1).optional(),
    policyNumber: z.string().trim().min(1).optional(),
    lineOfBusiness: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    premiumAmount: z.number().nonnegative().finite().nullable().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
})

export async function updatePolicyFields(
    policyId: string,
    fields: z.infer<typeof updateSchema>
): Promise<PolicyActionResult> {
    const admin = await verifyAdminRole()
    if (!policyId || typeof policyId !== "string") return { ok: false, error: "Invalid policy id." }
    const parsed = updateSchema.safeParse(fields)
    if (!parsed.success) return { ok: false, error: "Invalid field values." }

    const data: Record<string, unknown> = {}
    for (const key of ["insurerName", "policyNumber", "lineOfBusiness", "status"] as const) {
        if (parsed.data[key] !== undefined) data[key] = parsed.data[key]
    }
    if (parsed.data.premiumAmount !== undefined) data.premiumAmount = parsed.data.premiumAmount
    for (const key of ["startDate", "endDate"] as const) {
        if (parsed.data[key] !== undefined) {
            const d = new Date(parsed.data[key] as string)
            if (Number.isNaN(d.getTime())) return { ok: false, error: `Invalid ${key}.` }
            data[key] = d
        }
    }
    if (Object.keys(data).length === 0) return { ok: false, error: "No fields to update." }

    const existing = await db.policy.findUnique({ where: { id: policyId }, select: { id: true } })
    if (!existing) return { ok: false, error: "Policy not found." }

    try {
        await db.policy.update({ where: { id: policyId }, data })
        await logAdminAction(
            admin.id,
            admin.email,
            "UPDATE_POLICY_FIELDS",
            `Edited policy ${policyId} fields: ${Object.keys(data).join(", ")}`,
            { policyId, fields: Object.keys(data) }
        )
        return { ok: true }
    } catch (error) {
        Sentry.captureException(error)
        return { ok: false, error: "Failed to update policy." }
    }
}

const mergeSchema = z.object({
    sourceId: z.string().trim().min(1),
    targetId: z.string().trim().min(1),
})

/**
 * Merge `sourceId` into `targetId`: the target survives, the source's documents
 * and period fold in, and the source row is deleted. Reuses the mutual-consent
 * flow's core (mergePolicyRecords) — admin merge skips the consent request only.
 */
export async function mergePolicies(input: {
    sourceId: string
    targetId: string
}): Promise<PolicyActionResult<{ mergedIntoPolicyId?: string }>> {
    const admin = await verifyAdminRole()
    const parsed = mergeSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Invalid merge details." }

    const { sourceId, targetId } = parsed.data
    // target = survivor (existing), source = folded-in + deleted (incoming)
    const result = await mergePolicyRecords(targetId, sourceId)
    if (!result.ok) {
        const map: Record<string, string> = {
            SAME_POLICY: "Source and target are the same policy.",
            NOT_FOUND: "One of the policies was not found.",
            OWNER_MISMATCH: "The two policies belong to different owners and can't be merged.",
        }
        return { ok: false, error: map[result.error || ""] || "Failed to merge policies." }
    }

    await logAdminAction(
        admin.id,
        admin.email,
        "MERGE_POLICIES",
        `Merged policy ${sourceId} into ${targetId}`,
        { sourceId, targetId, mergedIntoPolicyId: result.mergedIntoPolicyId }
    )
    return { ok: true, mergedIntoPolicyId: result.mergedIntoPolicyId }
}
