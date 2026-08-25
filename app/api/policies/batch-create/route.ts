import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { BATCH_UPLOAD_MAX_FILES } from "@/lib/constants/time"
import { buildFailure, type BatchFailureCode } from "@/lib/wallet/batch-upload-errors"

// A bulk upload is a BATCH, not a transaction. Every policy that can be written
// is written, and the ones that cannot are reported individually — the user
// never re-uploads a document that already succeeded.
//
// The field-level `.min(1)` constraints below used to live in the Zod schema.
// That made them ARRAY-level: `withApiGuard` rejects the whole body on a parse
// failure, so a single document whose start date the extractor could not read
// returned 400 and created ZERO policies — the exact opposite of partial
// success. They are per-item business checks now, and the schema only pins
// types.
const policySchema = z.object({
    insurerName: z.string(),
    policyNumber: z.string(),
    lineOfBusiness: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    premiumAmount: z.number().nullable().optional(),
    coverageSummary: z.string().nullable().optional(),
    acordData: z.any().optional(),
    extractionMeta: z.object({
        overallConfidence: z.number().optional(),
        requiresReview: z.boolean().optional(),
        missingCriticalFields: z.array(z.string()).optional(),
    }).optional(),
})

const batchCreateSchema = z.object({
    policies: z.array(policySchema).min(1).max(BATCH_UPLOAD_MAX_FILES),
    /** Ties these rows to the extraction logs for the same upload. */
    batchId: z.string().max(64).optional(),
})

/** Case-insensitive identity of a policy within one owner's wallet. */
function duplicateKey(insurerName: string, policyNumber: string): string {
    return `${insurerName.trim().toLowerCase()}::${policyNumber.trim().toLowerCase()}`
}

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { body: batchCreateSchema },
        rateLimit: {
            limit: 6,
            windowMs: 60 * 1000,
            key: ({ auth }) => `policy:batch-create:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, body }) => {
        const authResult = auth!
        try {
            const { policies, batchId } = body!
            const userId = authResult.dbUser.id

            // Enforce the plan's policy quota — batch upload must not bypass
            // the same limit that single-policy creation enforces.
            const entitlements = await resolveUserEntitlements(userId)
            const policyLimit = entitlements.limits.policies
            if (policyLimit !== null) {
                const currentCount = await db.policy.count({
                    where: { ownerUserId: userId, status: { not: "deleted" } },
                })
                const remaining = Math.max(policyLimit - currentCount, 0)
                if (policies.length > remaining) {
                    await recordConversionEvent(userId, "limit_hit", { kind: "policy", source: "batch_create" })
                    return NextResponse.json(
                        {
                            success: false,
                            ...buildFailure("POLICY_LIMIT_REACHED"),
                            limit: policyLimit,
                            current: currentCount,
                            remaining,
                        },
                        { status: 403 }
                    )
                }
            }

            // Every non-cancelled policy this owner already holds, read once.
            // The single-upload path has always done this check
            // (policy.service.ts); batch create never did, so re-uploading a
            // document already in the wallet silently produced a second copy —
            // and a retry of a partly-saved batch produced one per attempt.
            const existing = await db.policy.findMany({
                where: { ownerUserId: userId, NOT: { status: "cancelled" } },
                select: { id: true, insurerName: true, policyNumber: true },
            })
            const existingByKey = new Map(
                existing.map((p) => [duplicateKey(p.insurerName || "", p.policyNumber || ""), p.id])
            )

            // Index into the submitted array is retained, not just the id: the
            // client has to attach each document to the policy that document
            // became, and an id-only list cannot say which is which once any
            // row has been rejected.
            const createdPolicies: Array<{ id: string; index: number }> = []
            const failedPolicies: Array<{
                index: number
                policyNumber: string
                code: BatchFailureCode
                context?: Record<string, unknown>
            }> = []

            const fail = (
                index: number,
                policyNumber: string,
                code: BatchFailureCode,
                context?: Record<string, unknown>
            ) => {
                failedPolicies.push({ index, policyNumber: policyNumber || "", code, ...(context ? { context } : {}) })
                logger("warn", "policy-batch-create", {
                    batchId: batchId || null,
                    userId,
                    index,
                    stage: buildFailure(code).stage,
                    outcome: "failed",
                    code,
                })
            }

            for (const [index, policyData] of policies.entries()) {
                const insurerName = (policyData.insurerName || "").trim()
                const policyNumber = (policyData.policyNumber || "").trim()

                // Per-item required-field check. Reaching here with a blank is
                // possible only if a client skipped the extract route's own gate.
                const missingFields = (["insurerName", "policyNumber", "startDate", "endDate"] as const)
                    .filter((field) => !String(policyData[field] || "").trim())
                if (missingFields.length > 0) {
                    fail(index, policyNumber, "REQUIRED_DATA_MISSING", { missingFields })
                    continue
                }

                const startDate = new Date(policyData.startDate)
                const endDate = new Date(policyData.endDate)
                if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                    fail(index, policyNumber, "INVALID_POLICY_PERIOD", { reason: "unparseable" })
                    continue
                }
                if (endDate <= startDate) {
                    fail(index, policyNumber, "INVALID_POLICY_PERIOD", { reason: "end_before_start" })
                    continue
                }

                // Against the wallet, and against earlier items in THIS batch —
                // uploading the same document twice in one go is a duplicate too,
                // and the in-memory map is what catches it before the write.
                const key = duplicateKey(insurerName, policyNumber)
                const clash = existingByKey.get(key)
                if (clash) {
                    fail(index, policyNumber, "DUPLICATE_POLICY", { existingPolicyId: clash })
                    continue
                }

                try {
                    // Only mark 'active' when extraction passed minimum quality checks.
                    // Otherwise use 'incomplete' so the user knows manual review is needed.
                    const meta = policyData.extractionMeta
                    const passesQA = Boolean(
                        meta &&
                        !meta.requiresReview &&
                        (meta.overallConfidence ?? 0) >= 80 &&
                        (meta.missingCriticalFields?.length ?? 0) === 0
                    )
                    const initialStatus = passesQA ? 'active' : 'incomplete'

                    const policy = await db.policy.create({
                        data: {
                            ownerUserId: userId,
                            createdByUserId: userId,
                            insurerName,
                            policyNumber,
                            // Was `|| 'motor'`: an unrecognised line silently became
                            // a car policy. The taxonomy resolves it, and resolves
                            // the unplaceable to `other`.
                            lineOfBusiness: normalizeBranch(policyData.lineOfBusiness).id,
                            startDate,
                            endDate,
                            premiumAmount: policyData.premiumAmount || null,
                            coverageSummary: policyData.coverageSummary || null,
                            acordData: policyData.acordData || undefined,
                            status: initialStatus,
                        }
                    })
                    createdPolicies.push({ id: policy.id, index })
                    // Claim the key so a second copy later in the same batch is
                    // caught even though it is not yet visible in `existing`.
                    existingByKey.set(key, policy.id)
                } catch (error: any) {
                    // Log the real error; never echo Prisma/DB internals to the client.
                    logger("error", "policy-batch-create", {
                        batchId: batchId || null,
                        userId,
                        index,
                        stage: "persistence",
                        outcome: "failed",
                        code: "PERSISTENCE_FAILED",
                        error: error?.message,
                    })
                    failedPolicies.push({ index, policyNumber, code: "PERSISTENCE_FAILED" })
                }
            }

            // Log batch creation
            await (db as any).activityLog.create({
                data: {
                    adminUserId: userId,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICIES_BATCH_CREATED",
                    description: `Batch created ${createdPolicies.length} policies`,
                    metadata: {
                        batchId: batchId || null,
                        count: createdPolicies.length,
                        failedCount: failedPolicies.length,
                        policyIds: createdPolicies.map(p => p.id),
                        // Codes only — enough to answer "4 failed: 2 duplicates,
                        // 1 undated, 1 write error" without storing document data.
                        failedCodes: failedPolicies.map(f => f.code),
                        failedPolicies,
                    }
                }
            })

            // Recompute the owner's gaps + protection score once the batch has
            // landed. Single-policy create reaches gap detection through its
            // background analysis run; batch create never enters that path — it
            // persists the client-extracted rows and stops — so without this a
            // batch upload leaves the score unchanged and detects no gaps,
            // including the duplicate coverage ACROSS the batch that uploading
            // several policies at once is the very moment to surface.
            // Deterministic (no AI tokens), best-effort: a recompute failure must
            // not fail a batch that already committed.
            if (createdPolicies.length > 0) {
                try {
                    const { refreshProtectionScore } = await import("@/lib/services/gap-engine")
                    await refreshProtectionScore(userId)
                } catch (error) {
                    logger("error", "policy-batch-create", {
                        batchId: batchId || null,
                        userId,
                        stage: "persistence",
                        outcome: "recompute_failed",
                        error: error instanceof Error ? error.message : String(error),
                    })
                }
            }

            revalidatePath("/wallet")
            revalidatePath("/protection")
            revalidatePath("/dashboard")

            return NextResponse.json({
                // A batch in which every item was a duplicate did nothing wrong;
                // `success` reports whether the request was handled, and `count`
                // reports what it wrote.
                success: failedPolicies.length === 0 || createdPolicies.length > 0,
                count: createdPolicies.length,
                failedCount: failedPolicies.length,
                policyIds: createdPolicies.map(p => p.id),
                /** (submitted index → policy id), so each source document can be attached. */
                created: createdPolicies,
                failedPolicies,
            })

        } catch (error) {
            logger("error", "policy-batch-create", {
                userId: authResult.dbUser.id,
                stage: "persistence",
                outcome: "failed",
                code: "PERSISTENCE_FAILED",
                error: error instanceof Error ? error.message : String(error),
            })
            return NextResponse.json(
                { success: false, ...buildFailure("PERSISTENCE_FAILED") },
                { status: 500 }
            )
        }
    }
)
