import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { ensureOwnership } from "@/lib/security"

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id } = await params

    const ownership = await ensureOwnership(db.accessGrant, id, session.user.id, "granterUserId")
    if (!ownership.success) return ownership.error!

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
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
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
