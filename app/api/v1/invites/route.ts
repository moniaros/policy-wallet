import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"

const InviteSchema = z.object({
    invitee_email: z.string().email(),
    scope: z.enum(["portfolio", "upload_only"]),
    policy_ids: z.array(z.string()).optional(),
    message: z.string().optional(),
})

export async function POST(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    // Rate limiting: max 5 invites per minute to prevent user or referral spam
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 5, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const body = await req.json()
        const { invitee_email, scope, policy_ids, message } = InviteSchema.parse(body)

        // Verify ownership of policies if provided
        if (policy_ids && policy_ids.length > 0) {
            const count = await db.policy.count({
                where: {
                    id: { in: policy_ids },
                    ownerUserId: authResult.dbUser.id
                }
            })
            if (count !== policy_ids.length) {
                return createApiError("FORBIDDEN", "You don't own all specified policies", 403)
            }
        }

        const token = crypto.randomUUID().replace(/-/g, '')

        const invite = await db.invite.create({
            data: {
                inviterUserId: authResult.dbUser.id,
                inviteeEmail: invitee_email,
                inviteType: "access_grant",
                scope: scope,
                token: token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                requestedPermissions: JSON.stringify(policy_ids || [])
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "INVITE_CREATED",
                description: `Created invite for ${invitee_email} with scope ${scope}`,
            }
        })

        return createApiResponse({
            id: invite.id,
            invitee_email: invite.inviteeEmail,
            scope: invite.scope,
            token: invite.token,
            invite_link: `${process.env.NEXTAUTH_URL}/accept-invite/${invite.token}`,
            status: "sent",
            expires_at: invite.expiresAt,
            created_at: invite.createdAt
        })
    } catch (error) {
        console.error(error)
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid data", 400, error.issues)
        }
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}
