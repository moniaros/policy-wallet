import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function GET() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    try {
        const grants = await db.accessGrant.findMany({
            where: {
                granterUserId: authResult.dbUser.id,
                status: "active"
            },
            include: {
                grantee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return createApiResponse({
            grants: grants.map(g => ({
                id: g.id,
                grantee: (g as any).grantee,
                scope: g.scope,
                permissions: g.permissions.split(","),
                status: g.status,
                granted_at: g.grantedAt
            }))
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}
