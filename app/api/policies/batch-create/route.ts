import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { recordConversionEvent } from "@/lib/journey/conversion-events"

const policySchema = z.object({
    insurerName: z.string().min(1),
    policyNumber: z.string().min(1),
    lineOfBusiness: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
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
    policies: z.array(policySchema).min(1).max(10),
})

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
            const { policies } = body!

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
                            error: "POLICY_LIMIT_REACHED",
                            limit: policyLimit,
                            current: currentCount,
                            remaining,
                        },
                        { status: 403 }
                    )
                }
            }

            const createdPolicies: Array<{ id: string }> = []
            const failedPolicies: Array<{ index: number; policyNumber: string; error: string }> = []

            for (const [index, policyData] of policies.entries()) {
                const startDate = new Date(policyData.startDate)
                const endDate = new Date(policyData.endDate)
                if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                    failedPolicies.push({
                        index,
                        policyNumber: policyData.policyNumber || "unknown",
                        error: "Invalid date format"
                    })
                    continue
                }
                if (endDate <= startDate) {
                    failedPolicies.push({
                        index,
                        policyNumber: policyData.policyNumber || "unknown",
                        error: "End date must be after start date"
                    })
                    continue
                }

                try {
                    // Only mark 'analyzing' when extraction passed minimum quality checks.
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
                            insurerName: policyData.insurerName,
                            policyNumber: policyData.policyNumber,
                            lineOfBusiness: policyData.lineOfBusiness || 'motor',
                            startDate,
                            endDate,
                            premiumAmount: policyData.premiumAmount || null,
                            coverageSummary: policyData.coverageSummary || null,
                            acordData: policyData.acordData || undefined,
                            status: initialStatus,
                        }
                    })
                    createdPolicies.push(policy)
                } catch (error: any) {
                    // Log the real error; never echo Prisma/DB internals to the client.
                    console.error("Batch create: policy failed", { index, error: error?.message })
                    failedPolicies.push({
                        index,
                        policyNumber: policyData.policyNumber || "unknown",
                        error: "Failed to create policy"
                    })
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
                        count: createdPolicies.length,
                        failedCount: failedPolicies.length,
                        policyIds: createdPolicies.map(p => p.id),
                        failedPolicies
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
                    console.error("Batch create: gap recompute failed", {
                        userId, error: error instanceof Error ? error.message : String(error),
                    })
                }
            }

            revalidatePath("/wallet")
            revalidatePath("/coverage-insights")
            revalidatePath("/dashboard")

            return NextResponse.json({
                success: createdPolicies.length > 0,
                count: createdPolicies.length,
                failedCount: failedPolicies.length,
                policyIds: createdPolicies.map(p => p.id),
                failedPolicies
            })

        } catch (error) {
            console.error("Batch create error:", error)
            return NextResponse.json({
                error: "Failed to create policies"
            }, { status: 500 })
        }
    }
)
