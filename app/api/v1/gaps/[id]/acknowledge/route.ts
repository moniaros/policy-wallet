import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    try {
        // Verify ownership through Policy relation
        const gapCheck = await db.gapInstance.findFirst({
            where: {
                id,
                policy: { ownerUserId: authResult.dbUser.id }
            }
        })

        if (!gapCheck) return createApiError("NOT_FOUND", "Gap not found or ownership mismatch", 404)

        const gap = await db.gapInstance.update({
            where: { id },
            data: {
                status: "acknowledged"
            }
        })

        return createApiResponse({
            id: gap.id,
            status: gap.status,
            acknowledged_at: new Date()
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Failed to acknowledge gap", 500)
    }
}
