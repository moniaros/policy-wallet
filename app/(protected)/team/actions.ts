"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import type { TeamRole } from "@/lib/services/team.service"

export async function getTeamData() {
    const { dbUser } = await getAuthenticatedUser()
    const { getTeamOverview } = await import("@/lib/services/team.service")
    return getTeamOverview(dbUser.id)
}

export async function createAgencyAction(data: {
    name: string
    website?: string
    phone?: string
    address?: string
    taxId?: string
}) {
    const { dbUser } = await getAuthenticatedUser()
    const { createAgency } = await import("@/lib/services/team.service")

    try {
        await createAgency(dbUser.id, data)
        revalidatePath("/team")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to create agency" }
    }
}

export async function inviteMemberAction(email: string, role: TeamRole = "member") {
    const { dbUser } = await getAuthenticatedUser()
    const { inviteTeamMember } = await import("@/lib/services/team.service")

    try {
        await inviteTeamMember(dbUser.id, email, role)
        revalidatePath("/team")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to invite member" }
    }
}

export async function acceptInviteAction() {
    const { dbUser } = await getAuthenticatedUser()
    const { acceptTeamInvite } = await import("@/lib/services/team.service")

    try {
        await acceptTeamInvite(dbUser.id)
        revalidatePath("/team")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to accept invite" }
    }
}

export async function removeMemberAction(memberUserId: string) {
    const { dbUser } = await getAuthenticatedUser()
    const { removeTeamMember } = await import("@/lib/services/team.service")

    try {
        await removeTeamMember(dbUser.id, memberUserId)
        revalidatePath("/team")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to remove member" }
    }
}

export async function updateRoleAction(memberUserId: string, newRole: TeamRole) {
    const { dbUser } = await getAuthenticatedUser()
    const { updateMemberRole } = await import("@/lib/services/team.service")

    try {
        await updateMemberRole(dbUser.id, memberUserId, newRole)
        revalidatePath("/team")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to update role" }
    }
}

export async function transferCustomerAction(relationshipId: string, newAgentUserId: string) {
    const { dbUser } = await getAuthenticatedUser()
    const { transferCustomer } = await import("@/lib/services/team.service")

    try {
        await transferCustomer(dbUser.id, relationshipId, newAgentUserId)
        revalidatePath("/team")
        revalidatePath("/customers")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to transfer customer" }
    }
}

export async function leaveTeamAction() {
    const { dbUser } = await getAuthenticatedUser()
    const { leaveTeam } = await import("@/lib/services/team.service")

    try {
        await leaveTeam(dbUser.id)
        revalidatePath("/team")
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to leave team" }
    }
}

// ── Shared pipeline for team view ──

export async function getTeamPipeline() {
    const { dbUser } = await getAuthenticatedUser()
    const { getTeamMemberIds, isTeamManager } = await import("@/lib/services/team.service")
    const { db } = await import("@/lib/db")

    const canSeeAll = await isTeamManager(dbUser.id)
    const memberIds = canSeeAll ? await getTeamMemberIds(dbUser.id) : [dbUser.id]

    const opportunities = await db.opportunity.findMany({
        where: { ownerAgentUserId: { in: memberIds } },
        include: {
            owner: { select: { id: true, name: true, image: true } },
            relationship: {
                include: {
                    customer: { select: { name: true } },
                },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
    })

    return opportunities.map((o) => ({
        id: o.id,
        status: o.status,
        lineOfBusiness: o.lineOfBusiness,
        estimatedPremium: o.estimatedPremium ? Number(o.estimatedPremium) : null,
        wonPremium: o.wonPremium ? Number(o.wonPremium) : null,
        customerName: o.relationship.customer?.name || "Unknown",
        agentName: o.owner.name || "Unknown",
        agentId: o.owner.id,
        agentPhoto: o.owner.image,
        updatedAt: o.updatedAt.toISOString(),
        notes: o.notes,
    }))
}
