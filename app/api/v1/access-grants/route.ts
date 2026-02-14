import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"

export async function GET() {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

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
