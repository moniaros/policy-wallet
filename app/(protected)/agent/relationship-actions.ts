"use server"

/**
 * Relationship termination — owner decision from the 2026-07-21 GDPR review:
 * both sides can end an agent↔customer relationship. Termination is a STATUS
 * FLIP plus revocation of the access grants between the two people — never
 * data deletion (each side keeps their own records; erasure is a separate,
 * GDPR-governed path). A terminated relationship leaves the agent's book,
 * stops policy access and blocks new collaboration threads.
 */

import { db } from "@/lib/db"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"

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
