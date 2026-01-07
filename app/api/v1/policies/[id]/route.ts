import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { ensureOwnership } from "@/lib/security"
import { logger } from "@/lib/logger"

const UpdatePolicySchema = z.object({
    policyNumber: z.string().optional(),
    insurerName: z.string().optional(),
    startDate: z.string().pipe(z.coerce.date()).optional(),
    endDate: z.string().pipe(z.coerce.date()).optional(),
    premiumAmount: z.number().optional(),
    status: z.string().optional(),
})

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id } = await params

    const ownership = await ensureOwnership(db.policy, id, session.user.id)
    if (!ownership.success) return ownership.error!

    try {
        const policy = await db.policy.findUnique({
            where: { id },
            include: {
                documents: true,
                gapInstances: {
                    where: { resolvedAt: null },
                    include: { definition: true }
                }
            }
        })

        if (!policy) return createApiError("NOT_FOUND", "Policy not found", 404)

        const highlights = [
            `Policy Number: ${policy.policyNumber}`,
            `Insurer: ${policy.insurerName}`,
            `LOB: ${policy.lineOfBusiness}`,
            `Valid until: ${policy.endDate.toDateString()}`
        ]

        return createApiResponse({
            ...policy,
            highlights,
            gaps: {
                count: policy.gapInstances.length,
                items: policy.gapInstances.map(gi => ({
                    id: gi.id,
                    gap_definition_id: gi.gapDefinitionId,
                    title: (gi.definition as any).title,
                    description: (gi.definition as any).description,
                    severity: gi.severity,
                    status: gi.status,
                    ai_explanation: gi.aiExplanation,
                    ai_suggestion: gi.aiSuggestion,
                    detected_at: gi.detectedAt
                }))
            }
        })
    } catch (error) {
        logger('error', 'Fetch policy failed', { id, error, userId: session.user.id })
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id } = await params

    const ownership = await ensureOwnership(db.policy, id, session.user.id)
    if (!ownership.success) return ownership.error!

    try {
        const body = await req.json()
        const validatedData = UpdatePolicySchema.parse(body)

        const policy = await db.policy.update({
            where: { id },
            data: validatedData
        })

        return createApiResponse(policy)
    } catch (error) {
        console.error(error)
        return createApiError("BAD_REQUEST", "Update failed", 400)
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id } = await params

    const ownership = await ensureOwnership(db.policy, id, session.user.id)
    if (!ownership.success) return ownership.error!

    try {
        await db.policy.update({
            where: { id },
            data: { status: "deleted" }
        })

        // Log Activity
        await (db.activityLog as any).create({
            data: {
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
                actionType: "POLICY_DELETED",
                description: `Soft-deleted policy ${id}`,
                metadata: { policyId: id }
            }
        })

        logger('info', 'Policy soft-deleted', { id, userId: session.user.id })

        return createApiResponse({ message: "Policy deleted successfully" })
    } catch (error) {
        logger('error', 'Delete policy failed', { id, error, userId: session.user.id })
        return createApiError("INTERNAL_ERROR", "Delete failed", 500)
    }
}
