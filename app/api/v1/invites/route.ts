import { db } from "@/lib/db"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { requireApiUser } from "@/lib/api-auth"
import { sendPolicyInviteEmail } from "@/lib/email/invite-emails"
import { daysFromNow, INVITE_EXPIRY_DAYS } from "@/lib/constants/time"

const InviteSchema = z.object({
    invitee_email: z.string().email(),
    scope: z.enum(["portfolio", "upload_only"]),
    policy_ids: z.array(z.string()).optional(),
    message: z.string().optional(),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limiting: max 5 invites per minute per USER — the bare-IP key
    // shared proxy.ts's global bucket and punished NAT'd offices.
    const limitCheck = await rateLimit(authResult.dbUser.id, 5, 60000, `invites:${authResult.dbUser.id}`)
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
                relationshipType: "policy_share",
                scope: scope,
                token: token,
                expiresAt: daysFromNow(INVITE_EXPIRY_DAYS), // 7 days
                requestedPermissions: JSON.stringify(policy_ids || [])
            }
        })

        let emailQueued = false
        try {
            const emailResult = await sendPolicyInviteEmail({
                to: invitee_email,
                token: invite.token,
                inviterName: authResult.dbUser.name || authResult.dbUser.email,
                language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
            })
            emailQueued = Boolean(emailResult.success)
        } catch (emailError) {
            console.error("Failed to send invite email", emailError)
        }

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
            invite_link: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${invite.token}`,
            status: emailQueued ? "sent" : "created",
            email_queued: emailQueued,
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
