import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

interface PolicyData {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount?: number | null
    coverageSummary?: string | null
}

export async function POST(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { policies } = await request.json() as { policies: PolicyData[] }

        if (!policies || !Array.isArray(policies) || policies.length === 0) {
            return NextResponse.json({ error: "No policies provided" }, { status: 400 })
        }

        if (policies.length > 10) {
            return NextResponse.json({ error: "Maximum 10 policies per batch" }, { status: 400 })
        }

        const userId = authResult.dbUser.id
        const createdPolicies = []

        for (const policyData of policies) {
            // Validate required fields
            if (!policyData.insurerName || !policyData.policyNumber) {
                continue // Skip invalid policies
            }

            const policy = await db.policy.create({
                data: {
                    ownerUserId: userId,
                    createdByUserId: userId,
                    insurerName: policyData.insurerName,
                    policyNumber: policyData.policyNumber,
                    lineOfBusiness: policyData.lineOfBusiness || 'motor',
                    startDate: new Date(policyData.startDate),
                    endDate: new Date(policyData.endDate),
                    premiumAmount: policyData.premiumAmount || null,
                    coverageSummary: policyData.coverageSummary || null,
                    status: 'active'
                }
            })
            createdPolicies.push(policy)
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
                    policyIds: createdPolicies.map(p => p.id)
                }
            }
        })

        revalidatePath("/wallet")

        return NextResponse.json({
            success: true,
            count: createdPolicies.length,
            policyIds: createdPolicies.map(p => p.id)
        })

    } catch (error) {
        console.error("Batch create error:", error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Failed to create policies"
        }, { status: 500 })
    }
}
