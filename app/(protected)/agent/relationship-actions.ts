"use server"

/**
 * Relationship termination — owner decision from the 2026-07-21 GDPR review:
 * both sides can end an agent↔customer relationship. Termination is a STATUS
 * FLIP plus revocation of the access grants between the two people — never
 * data deletion (each side keeps their own records; erasure is a separate,
 * GDPR-governed path). A terminated relationship leaves the agent's book,
 * stops policy access and blocks new collaboration threads.
 */

import { z } from "zod"
import { db } from "@/lib/db"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { absoluteUrl } from "@/lib/seo/site"
import { INVITE_EXPIRY_DAYS, daysFromNow } from "@/lib/constants/time"
import { normalizeEmail } from "@/lib/identity/normalize-email"

type TerminationResult = { success: true } | { success: false; error: string }

async function terminateRelationship(
    relationshipId: string,
    actorUserId: string,
    actorSide: "agent" | "customer"
): Promise<TerminationResult> {
    // Ownership scope in the where clause — an id alone never suffices.
    const relationship = await db.customerRelationship.findFirst({
        where: {
            id: relationshipId,
            ...(actorSide === "agent"
                ? { agentUserId: actorUserId }
                : { policyholderUserId: actorUserId }),
        },
        select: { id: true, status: true, agentUserId: true, policyholderUserId: true },
    })

    if (!relationship) {
        return { success: false, error: "NOT_FOUND" }
    }
    if (relationship.status === "terminated") {
        return { success: true } // idempotent
    }

    const { agentUserId, policyholderUserId } = relationship

    await db.$transaction([
        db.customerRelationship.update({
            where: { id: relationship.id },
            data: { status: "terminated" },
        }),
        // Access ends with the relationship, in both directions.
        db.accessGrant.updateMany({
            where: {
                status: "active",
                OR: [
                    { granterUserId: policyholderUserId, granteeUserId: agentUserId },
                    { granterUserId: agentUserId, granteeUserId: policyholderUserId },
                ],
            },
            data: { status: "revoked", revokedAt: new Date() },
        }),
        db.activityLog.create({
            data: {
                adminUserId: actorUserId,
                adminEmail: "security",
                actionType: "RELATIONSHIP_TERMINATED",
                description: `Relationship ${relationship.id} terminated by the ${actorSide}`,
                metadata: { relationshipId: relationship.id, actorSide },
            },
        }),
    ])

    logger("info", "Customer relationship terminated", {
        relationshipId: relationship.id,
        actorSide,
    })

    return { success: true }
}

/** Agent removes a customer from their book. */
export async function terminateRelationshipAsAgent(relationshipId: string): Promise<TerminationResult> {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { success: false, error: "UNAUTHORIZED" }

    const result = await terminateRelationship(relationshipId, auth.dbUser.id, "agent")
    if (result.success) {
        revalidatePath("/customers")
        revalidatePath("/dashboard")
    }
    return result
}

/** Policyholder disconnects from their advisor. */
export async function disconnectFromAgent(relationshipId: string): Promise<TerminationResult> {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { success: false, error: "UNAUTHORIZED" }

    const result = await terminateRelationship(relationshipId, auth.dbUser.id, "customer")
    if (result.success) {
        revalidatePath("/agent")
    }
    return result
}

const AdvisorEmailSchema = z.string().trim().toLowerCase().email()

type InviteAdvisorResult =
    | { success: true; emailDelivered: boolean; inviteLink?: string; alreadyConnected?: boolean }
    | { success: false; error: "unauthorized" | "invalid_email" | "self" | "rate_limited" }

/**
 * Policyholder invites their insurance advisor by email (the inverse of the
 * agent→client invite). Creates a `signup`/`client_agent` Invite and emails the
 * advisor a secure /invite/<token> link. On acceptance `redeemInvite` makes the
 * advisor an agent and connects them (see app/auth/actions.ts). The relationship
 * is created at redeem time (keyed to the advisor's real id), so nothing is
 * pre-created here.
 */
export async function inviteAdvisorByEmail(rawEmail: string): Promise<InviteAdvisorResult> {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { success: false, error: "unauthorized" }
    const { dbUser } = auth

    const parsed = AdvisorEmailSchema.safeParse(rawEmail)
    if (!parsed.success) return { success: false, error: "invalid_email" }
    const email = normalizeEmail(parsed.data)

    // Can't invite yourself as your own advisor.
    if (dbUser.email && email === normalizeEmail(dbUser.email)) {
        return { success: false, error: "self" }
    }

    // Sends an email — cap per inviter to prevent email-bombing an address.
    const { rateLimit } = await import("@/lib/rate-limit")
    const limit = await rateLimit(dbUser.id, 20, 60 * 60 * 1000, `advisor-invite:${dbUser.id}`)
    if (!limit.success) return { success: false, error: "rate_limited" }

    // Already connected to this advisor? Friendly no-op (no duplicate invite/email).
    const existingAdvisor = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (existingAdvisor) {
        const rel = await db.customerRelationship.findUnique({
            where: {
                agentUserId_policyholderUserId: {
                    agentUserId: existingAdvisor.id,
                    policyholderUserId: dbUser.id,
                },
            },
            select: { status: true },
        })
        if (rel && rel.status === "active") {
            return { success: true, emailDelivered: false, alreadyConnected: true }
        }
    }

    const invite = await db.invite.create({
        data: {
            inviterUserId: dbUser.id,
            inviteeEmail: email,
            token: crypto.randomUUID().replace(/-/g, ""),
            inviteType: "signup",
            relationshipType: "client_agent",
            expiresAt: daysFromNow(INVITE_EXPIRY_DAYS),
        },
    })

    // sendEmail returns { success:false } rather than throwing — surface the
    // delivery state + a copyable fallback link so the policyholder never sees
    // "sent" when the advisor got nothing (same pattern as createAgentInvite).
    let emailDelivered = false
    try {
        const { sendAdvisorInviteEmail } = await import("@/lib/email/invite-emails")
        const result = await sendAdvisorInviteEmail({
            to: email,
            token: invite.token,
            inviterName: dbUser.name || dbUser.email,
            language: (dbUser.preferredLanguage as "el" | "en") || "en",
        })
        emailDelivered = result.success
    } catch (error) {
        logger("error", "Failed to send advisor invite email", {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return {
        success: true,
        emailDelivered,
        inviteLink: emailDelivered ? undefined : absoluteUrl(`/invite/${invite.token}`),
    }
}
