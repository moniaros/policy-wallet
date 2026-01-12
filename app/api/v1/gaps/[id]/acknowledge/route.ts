import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

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
