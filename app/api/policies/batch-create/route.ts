import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

interface PolicyData {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount?: number | null
    coverageSummary?: string | null
}

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

export async function POST(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const rawBody = await request.json()
        const parsed = batchCreateSchema.safeParse(rawBody)
        if (!parsed.success) {
            return NextResponse.json({
                error: "Invalid batch payload",
                issues: parsed.error.issues
            }, { status: 400 })
        }
        const { policies } = parsed.data

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
