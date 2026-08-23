import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export interface TeamMember {
    id: string
    userId: string
    name: string
    email: string
    role: "owner" | "manager" | "member"
    status: "active" | "suspended" | "invited"
    photoUrl?: string
    joinedAt: string | null
    customerCount: number
    pipelineValue: number
    wonValue: number
}

export interface TeamOverview {
    tenantId: string
    tenantName: string
    members: TeamMember[]
    stats: {
        totalMembers: number
        activeMembers: number
        totalCustomers: number
        totalPipeline: number
        totalWon: number
    }
}

export type TeamRole = "owner" | "manager" | "member"

// ────────────────────────────────────────────────
// Permission checks
// ────────────────────────────────────────────────

export async function getUserTenantMembership(userId: string) {
    return db.tenantMembership.findFirst({
        where: { userId, status: "active" },
        include: { tenant: true },
    })
}

export async function isTeamManager(userId: string): Promise<boolean> {
    const membership = await getUserTenantMembership(userId)
    return membership?.role === "owner" || membership?.role === "manager"
}

export async function isTeamOwner(userId: string): Promise<boolean> {
    const membership = await getUserTenantMembership(userId)
    return membership?.role === "owner"
}

export async function getTeamMemberIds(userId: string): Promise<string[]> {
    const membership = await getUserTenantMembership(userId)
    if (!membership) return [userId]

    const members = await db.tenantMembership.findMany({
        where: { tenantId: membership.tenantId, status: "active" },
        select: { userId: true },
    })

    return members.map((m) => m.userId)
}

// ────────────────────────────────────────────────
// Agency creation
// ────────────────────────────────────────────────

export async function createAgency(ownerUserId: string, data: {
    name: string
    logoUrl?: string
    brandColor?: string
    website?: string
    phone?: string
    address?: string
    taxId?: string
}) {
    // Check if user already has a team
    const existing = await getUserTenantMembership(ownerUserId)
    if (existing) {
        throw new Error("User already belongs to a team")
    }

    // Agency/team creation (group-admin capability) is a plan upgrade: only
    // tiers whose teamMembers entitlement exceeds 1 (agent_pro: 3, agency:
    // unlimited) can create a tenant.
    const entitlements = await resolveAgentEntitlements(ownerUserId)
    const teamLimit = entitlements.limits.teamMembers
    if (teamLimit !== null && teamLimit <= 1) {
        throw new Error("UPGRADE_REQUIRED")
    }

    const tenant = await db.tenant.create({
        data: {
            name: data.name,
            type: "agency",
            logoUrl: data.logoUrl,
            brandColor: data.brandColor || "#10b981",
            website: data.website,
            phone: data.phone,
            address: data.address,
            taxId: data.taxId,
            members: {
                create: {
                    userId: ownerUserId,
                    role: "owner",
                    status: "active",
                    joinedAt: new Date(),
                },
            },
        },
        include: { members: true },
    })

    return tenant
}

// ────────────────────────────────────────────────
// Team member management
// ────────────────────────────────────────────────

export async function inviteTeamMember(
    inviterUserId: string,
    inviteeEmail: string,
    role: TeamRole = "member"
) {
    const membership = await getUserTenantMembership(inviterUserId)
    if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
        throw new Error("Insufficient permissions to invite team members")
    }

    // Cannot invite as owner
    if (role === "owner") {
        throw new Error("Cannot invite as owner")
    }

    // Manager cannot invite another manager
    if (membership.role === "manager" && role === "manager") {
        throw new Error("Managers cannot invite other managers")
    }

    // Find user by email
    const invitee = await db.user.findUnique({ where: { email: inviteeEmail } })
    if (!invitee) {
        throw new Error("No user found with that email. They must register first.")
    }

    // Check if agent
    if (!invitee.roles.includes("agent")) {
        throw new Error("User must have agent role to join a team")
    }

    // Check if already in a team
    const existingMembership = await db.tenantMembership.findFirst({
        where: { userId: invitee.id, status: { in: ["active", "invited"] } },
    })
    if (existingMembership) {
        throw new Error("User already belongs to a team")
    }

    // Enforce the plan's team-size entitlement. The seat count is checked
    // against the tenant OWNER's plan — the tenant's capacity is theirs.
    const owner = await db.tenantMembership.findFirst({
        where: { tenantId: membership.tenantId, role: "owner" },
        select: { userId: true },
    })
    if (owner) {
        const ownerEntitlements = await resolveAgentEntitlements(owner.userId)
        const seatLimit = ownerEntitlements.limits.teamMembers
        if (seatLimit !== null) {
            const seatCount = await db.tenantMembership.count({
                where: { tenantId: membership.tenantId, status: { in: ["active", "invited"] } },
            })
            if (seatCount >= seatLimit) {
                throw new Error("UPGRADE_REQUIRED")
            }
        }
    }

    const newMembership = await db.tenantMembership.create({
        data: {
            tenantId: membership.tenantId,
            userId: invitee.id,
            role,
            status: "invited",
            invitedBy: inviterUserId,
            invitedAt: new Date(),
        },
    })

    // Notify invitee
    await sendNotification({
        userId: invitee.id,
        eventType: "team_invite",
        title: {
            el: `Πρόσκληση στην ομάδα ${membership.tenant.name}`,
            en: `Team invite from ${membership.tenant.name}`,
        },
        message: {
            el: `Σας προσκάλεσαν να συμμετάσχετε στην ομάδα ${membership.tenant.name} με ρόλο ${role}`,
            en: `You've been invited to join ${membership.tenant.name} as ${role}`,
        },
    })

    return newMembership
}

export async function acceptTeamInvite(userId: string) {
    const membership = await db.tenantMembership.findFirst({
        where: { userId, status: "invited" },
        include: { tenant: true },
    })
    if (!membership) {
        throw new Error("No pending invite found")
    }

    await db.tenantMembership.update({
        where: { id: membership.id },
        data: {
            status: "active",
            joinedAt: new Date(),
        },
    })

    // Notify the inviter
    if (membership.invitedBy) {
        const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } })
        await sendNotification({
            userId: membership.invitedBy,
            eventType: "team_invite_accepted",
            title: { el: "Η πρόσκληση έγινε δεκτή", en: "Team invite accepted" },
            message: {
                el: `Ο χρήστης ${user?.name || "ένας χρήστης"} εντάχθηκε στην ομάδα ${membership.tenant.name}`,
                en: `${user?.name || "A user"} has joined ${membership.tenant.name}`,
            },
        })
    }

    return { success: true }
}

export async function removeTeamMember(requesterUserId: string, memberUserId: string) {
    const requesterMembership = await getUserTenantMembership(requesterUserId)
    if (!requesterMembership) throw new Error("You are not in a team")

    if (requesterUserId === memberUserId) {
        throw new Error("Use leaveTeam to leave your own team")
    }

    const targetMembership = await db.tenantMembership.findFirst({
        where: { tenantId: requesterMembership.tenantId, userId: memberUserId },
    })
    if (!targetMembership) throw new Error("User is not in your team")

    // Permission checks
    if (requesterMembership.role === "member") {
        throw new Error("Members cannot remove other members")
    }
    if (targetMembership.role === "owner") {
        throw new Error("Cannot remove the team owner")
    }
    if (requesterMembership.role === "manager" && targetMembership.role === "manager") {
        throw new Error("Managers cannot remove other managers")
    }

    await db.tenantMembership.delete({ where: { id: targetMembership.id } })

    return { success: true }
}

export async function updateMemberRole(
    requesterUserId: string,
    memberUserId: string,
    newRole: TeamRole
) {
    if (newRole === "owner") throw new Error("Cannot assign owner role")

    const requesterMembership = await getUserTenantMembership(requesterUserId)
    if (!requesterMembership || requesterMembership.role !== "owner") {
        throw new Error("Only the owner can change roles")
    }

    const targetMembership = await db.tenantMembership.findFirst({
        where: { tenantId: requesterMembership.tenantId, userId: memberUserId },
    })
    if (!targetMembership) throw new Error("User is not in your team")
    if (targetMembership.role === "owner") throw new Error("Cannot change owner role")

    await db.tenantMembership.update({
        where: { id: targetMembership.id },
        data: { role: newRole },
    })

    return { success: true }
}

export async function leaveTeam(userId: string) {
    const membership = await getUserTenantMembership(userId)
    if (!membership) throw new Error("You are not in a team")
    if (membership.role === "owner") {
        throw new Error("Owner cannot leave the agency. Contact support to transfer ownership or close the agency.")
    }

    await db.tenantMembership.delete({ where: { id: membership.id } })
    return { success: true }
}

// ────────────────────────────────────────────────
// Customer assignment / transfer
// ────────────────────────────────────────────────

export async function transferCustomer(
    requesterUserId: string,
    relationshipId: string,
    newAgentUserId: string
) {
    const requesterMembership = await getUserTenantMembership(requesterUserId)
    if (!requesterMembership) throw new Error("You are not in a team")

    // Only owner/manager can transfer
    if (requesterMembership.role !== "owner" && requesterMembership.role !== "manager") {
        throw new Error("Only owners and managers can transfer customers")
    }

    // Verify new agent is in the same team
    const targetMembership = await db.tenantMembership.findFirst({
        where: { tenantId: requesterMembership.tenantId, userId: newAgentUserId, status: "active" },
    })
    if (!targetMembership) throw new Error("Target agent is not in your team")

    // Get the relationship
    const relationship = await db.customerRelationship.findUnique({
        where: { id: relationshipId },
        include: { customer: { select: { name: true } } },
    })
    if (!relationship) throw new Error("Relationship not found")

    // Verify the relationship belongs to a team member
    const teamMemberIds = await getTeamMemberIds(requesterUserId)
    if (!teamMemberIds.includes(relationship.agentUserId)) {
        throw new Error("Customer does not belong to your team")
    }

    const previousAgent = relationship.agentUserId

    // Reassignment ends the previous agent's relationship to this customer, so it
    // must end their access too — the same rule terminateRelationship enforces.
    // Without the revoke below, every policy that agent ever added for the customer
    // keeps its auto-minted `manage` grant (agent/actions.ts createPolicyForCustomer),
    // and computePolicyAccess reads grantLevel WITHOUT consulting the relationship.
    // The old agent would keep read/write/delete on that book of business forever.
    // Atomic with the reassignment: a partial apply here is an access leak.
    await db.$transaction([
        db.customerRelationship.update({
            where: { id: relationshipId },
            data: { agentUserId: newAgentUserId },
        }),
        db.accessGrant.updateMany({
            where: {
                status: "active",
                OR: [
                    { granterUserId: relationship.policyholderUserId, granteeUserId: previousAgent },
                    { granterUserId: previousAgent, granteeUserId: relationship.policyholderUserId },
                ],
            },
            data: { status: "revoked", revokedAt: new Date() },
        }),
        db.opportunity.updateMany({
            where: {
                relationshipId,
                ownerAgentUserId: previousAgent,
                status: { in: ["open", "contacted", "quoted"] },
            },
            data: { ownerAgentUserId: newAgentUserId },
        }),
        db.activityLog.create({
            data: {
                adminUserId: requesterUserId,
                adminEmail: "security",
                actionType: "CUSTOMER_TRANSFERRED",
                description: `Relationship ${relationshipId} transferred; prior agent access revoked`,
                metadata: { relationshipId, previousAgent, newAgentUserId },
            },
        }),
    ])

    // Notify new agent
    await sendNotification({
        userId: newAgentUserId,
        eventType: "customer_transferred",
        title: { el: "Πελάτης μεταφέρθηκε σε εσάς", en: "Customer transferred to you" },
        message: {
            el: `Ο πελάτης ${relationship.customer?.name || "ένας πελάτης"} μεταφέρθηκε σε εσάς`,
            en: `${relationship.customer?.name || "A customer"} has been transferred to you`,
        },
    })

    // Notify previous agent
    await sendNotification({
        userId: previousAgent,
        eventType: "customer_transferred",
        title: { el: "Μεταφορά πελάτη", en: "Customer transferred" },
        message: {
            el: `Ο πελάτης ${relationship.customer?.name || "ένας πελάτης"} μεταφέρθηκε σε άλλον σύμβουλο`,
            en: `${relationship.customer?.name || "A customer"} has been transferred to another agent`,
        },
    })

    return { success: true }
}

// ────────────────────────────────────────────────
// Team overview / dashboard data
// ────────────────────────────────────────────────

export async function getTeamOverview(userId: string): Promise<TeamOverview | null> {
    const membership = await getUserTenantMembership(userId)
    if (!membership) return null

    const members = await db.tenantMembership.findMany({
        where: { tenantId: membership.tenantId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
            },
        },
        orderBy: [
            { role: "asc" }, // owner first
            { joinedAt: "asc" },
        ],
    })

    // Per-member REVENUE is manager/owner-only — the pipeline view already
    // gates it, but this overview served every plain member each colleague's
    // pipeline and won totals. Members keep their own numbers; peers show 0.
    const viewerSeesRevenue = membership.role === "owner" || membership.role === "manager"

    // Gather per-member stats in parallel
    const memberStats = await Promise.all(
        members.map(async (m) => {
            const [customerCount, opportunities] = await Promise.all([
                db.customerRelationship.count({
                    where: { agentUserId: m.userId, status: "active" },
                }),
                db.opportunity.findMany({
                    where: { ownerAgentUserId: m.userId },
                    select: { status: true, estimatedPremium: true, wonPremium: true },
                }),
            ])

            const pipelineValue = opportunities
                .filter((o) => ["open", "contacted", "quoted"].includes(o.status))
                .reduce((sum, o) => sum + Number(o.estimatedPremium || 0), 0)

            const wonValue = opportunities
                .filter((o) => o.status === "won")
                .reduce((sum, o) => sum + Number(o.wonPremium || o.estimatedPremium || 0), 0)

            return {
                id: m.id,
                userId: m.userId,
                name: m.user.name || "Unknown",
                email: m.user.email,
                role: m.role as TeamRole,
                status: m.status as "active" | "suspended" | "invited",
                photoUrl: m.user.image || undefined,
                joinedAt: m.joinedAt?.toISOString() || null,
                customerCount,
                pipelineValue: viewerSeesRevenue || m.userId === userId ? pipelineValue : 0,
                wonValue: viewerSeesRevenue || m.userId === userId ? wonValue : 0,
            }
        })
    )

    const activeMembers = memberStats.filter((m) => m.status === "active")
    const totalCustomers = activeMembers.reduce((s, m) => s + m.customerCount, 0)
    // Totals come from the MASKED values: unmasked totals let a two-member
    // team's plain member derive the colleague's exact revenue (total − own).
    // Managers see true totals (masked == raw for them); members see the sum
    // of what they are allowed to see.
    const totalPipeline = activeMembers.reduce((s, m) => s + m.pipelineValue, 0)
    const totalWon = activeMembers.reduce((s, m) => s + m.wonValue, 0)

    return {
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        members: memberStats,
        stats: {
            totalMembers: members.length,
            activeMembers: activeMembers.length,
            totalCustomers,
            totalPipeline,
            totalWon,
        },
    }
}
