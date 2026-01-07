import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const InviteSchema = z.object({
    invitee_email: z.string().email(),
    scope: z.enum(["portfolio", "upload_only"]),
    policy_ids: z.array(z.string()).optional(),
    message: z.string().optional(),
})

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const body = await req.json()
        const { invitee_email, scope, policy_ids, message } = InviteSchema.parse(body)

        // Verify ownership of policies if provided
        if (policy_ids && policy_ids.length > 0) {
            const count = await db.policy.count({
                where: {
                    id: { in: policy_ids },
                    ownerUserId: session.user.id
                }
            })
            if (count !== policy_ids.length) {
                return NextResponse.json(
                    { error: { code: "FORBIDDEN", message: "You don't own all specified policies", status: 403 } },
                    { status: 403 }
                )
            }
        }

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

        const invite = await db.invite.create({
            data: {
                inviterUserId: session.user.id,
                inviteeEmail: invite_email,
                inviteType: "access_grant",
                scope: scope,
                token: token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                requestedPermissions: JSON.stringify(policy_ids || []) // Using this field to store targeted policy IDs for MVP
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
                actionType: "INVITE_CREATED",
                description: `Created invite for ${invite_email} with scope ${scope}`,
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            data: {
                id: invite.id,
                invitee_email: invite.inviteeEmail,
                scope: invite.scope,
                token: invite.token,
                invite_link: `${process.env.NEXTAUTH_URL}/accept-invite/${invite.token}`,
                status: "sent",
                expires_at: invite.expiresAt,
                created_at: invite.createdAt
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: { code: "VALIDATION_ERROR", message: "Invalid data", details: error.errors, status: 400 } },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Server error", status: 500 } },
            { status: 500 }
        )
    }
}
