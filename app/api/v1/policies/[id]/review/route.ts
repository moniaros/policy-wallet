import { db } from "@/lib/db"
import { requireApiUser } from "@/lib/api-auth"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    try {
        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: authResult.dbUser.id
            }
        })

        if (!policy) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        // Mock job trigger
        const jobId = "job_review_" + crypto.randomUUID().substring(0, 8)

        await (db.activityLog as any).create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "POLICY_REVIEW_TRIGGERED",
                description: `Triggered AI review for policy ${policy.policyNumber}`,
                timestamp: new Date()
            }
        })

        return createApiResponse({
            job_id: jobId,
            status: "queued",
            message: "Policy review started. Results will be available shortly.",
            estimated_completion: new Date(Date.now() + 60000) // +1 min
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Failed to trigger review", 500)
    }
}
