import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"

const policySchema = z.object({
    insurerName: z.string().min(1),
    policyNumber: z.string().min(1),
    lineOfBusiness: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    premiumAmount: z.number().nullable().optional(),
    coverageSummary: z.string().nullable().optional(),
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
                            status: 'active'
                        }
                    })
                    createdPolicies.push(policy)
                } catch (error: any) {
                    failedPolicies.push({
                        index,
                        policyNumber: policyData.policyNumber || "unknown",
                        error: error?.message || "Failed to create policy"
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

            revalidatePath("/wallet")

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
                error: error instanceof Error ? error.message : "Failed to create policies"
            }, { status: 500 })
        }
    }
)
