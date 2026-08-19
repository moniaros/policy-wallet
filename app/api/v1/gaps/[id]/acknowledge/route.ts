import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { requireApiUser } from "@/lib/api-auth"
import { getPolicyAccess } from "@/lib/policy-access"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    try {
        const gapCheck = await db.gapInstance.findUnique({
            where: { id },
            select: { id: true, policyId: true, userId: true },
        })
        if (!gapCheck) return createApiError("NOT_FOUND", "Gap not found", 404)

        // Two kinds of gap live in this table. A policy-scoped one is
        // authorized by its policy, through the single path — an inline owner
        // filter here denied an advisor with a write grant the ability to
        // acknowledge a gap they can already see and act on. A profile-level
        // gap has no policy (policyId is null after the policy cascade) and
        // belongs to its subject directly.
        const authorized = gapCheck.policyId
            ? (
                  await getPolicyAccess(gapCheck.policyId, {
                      id: authResult.dbUser.id,
                      roles: authResult.dbUser.roles,
                  })
              ).canWrite
            : gapCheck.userId === authResult.dbUser.id

        if (!authorized) return createApiError("NOT_FOUND", "Gap not found", 404)

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
