import { NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    const { id } = await params

    try {
        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: authResult.dbUser.id
            }
        })

        if (!policy) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Policy not found", status: 404 } },
                { status: 404 }
            )
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

        return NextResponse.json({
            data: {
                job_id: jobId,
                status: "queued",
                message: "Policy review started. Results will be available shortly.",
                estimated_completion: new Date(Date.now() + 60000) // +1 min
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Failed to trigger review", status: 500 } },
            { status: 500 }
        )
    }
}
