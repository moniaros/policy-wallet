import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    const grant = await db.accessGrant.findUnique({
        where: { id },
    })

    if (!grant) return createApiError("NOT_FOUND", "Access grant not found", 404)
    if (grant.granterUserId !== authResult.dbUser.id) return createApiError("FORBIDDEN", "Ownership verification failed", 403)

    try {
        await db.accessGrant.update({
            where: { id },
            data: {
                status: "revoked",
                revokedAt: new Date()
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "ACCESS_REVOKED",
                description: `Revoked access grant ${id}`,
            }
        })

        return createApiResponse({ message: "Access revoked successfully" })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Failed to revoke access", 500)
    }
}
