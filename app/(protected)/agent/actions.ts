import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { sendNotification } from "@/lib/notifications"

export async function getAgentDashboardData() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/auth/signin")
    }

    // Ensure user has agent role
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true }
    })

    if (!user?.roles.includes('agent')) {
        return null
    }

    // Fetch summary stats
    const totalCustomers = await db.customerRelationship.count({
        where: { agentUserId: session.user.id }
    })

    const activeOpportunities = await db.opportunity.count({
        where: {
            ownerAgentUserId: session.user.id,
            status: 'open'
        }
    })

    const pendingInvites = await db.invite.count({
        where: {
            inviterUserId: session.user.id,
            consumedAt: null
        }
    })

    // Fetch recent customers
    const recentCustomers = await db.customerRelationship.findMany({
        where: { agentUserId: session.user.id },
        include: {
            customer: {
                select: {
                    name: true,
                    email: true,
                    image: true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    // Fetch recent opportunities
    const recentOpportunities = await db.opportunity.findMany({
        where: { ownerAgentUserId: session.user.id },
        include: {
            relationship: {
                include: {
                    customer: {
                        select: { name: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    return {
        stats: {
            totalCustomers,
            activeOpportunities,
            pendingInvites
        },
        recentCustomers,
        recentOpportunities
    }
}

export async function getAgentCustomers() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/auth/signin")
    }

    return await db.customerRelationship.findMany({
        where: { agentUserId: session.user.id },
        include: {
            customer: {
                select: {
                    name: true,
                    email: true,
                    image: true
                }
            }
        },
        orderBy: { lastInteractionAt: 'desc' }
    })
}

export async function inviteCustomer(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const email = formData.get("email") as string
    if (!email) {
        throw new Error("Email is required")
    }

    // Generate a unique token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Create the invite in DB
    await db.invite.create({
        data: {
            inviterUserId: session.user.id,
            inviteeEmail: email,
            inviteType: 'signup',
            token: token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
    })

    // In a real app, send email here
    console.log(`[INVITE] Invitation token for ${email}: ${token}`)

    return { success: true, token }
}

export async function getQuestionnaireTemplates() {
    return await db.questionnaireTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    })
}

export async function sendQuestionnaire(relationshipId: string, templateId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // Verify relationship and agent ownership
    const relationship = await db.customerRelationship.findUnique({
        where: { id: relationshipId },
        select: { agentUserId: true, policyholderUserId: true }
    })

    if (!relationship || relationship.agentUserId !== session.user.id) {
        throw new Error("Relationship not found or unauthorized")
    }

    // Create questionnaire instance
    const instance = await db.questionnaireInstance.create({
        data: {
            templateId,
            relationshipId,
            sentToUserId: relationship.policyholderUserId,
            sentByUserId: session.user.id,
            status: 'pending'
        },
        include: {
            template: true,
            sender: { select: { name: true } }
        }
    })

    // Trigger notification
    await sendNotification({
        userId: relationship.policyholderUserId,
        eventType: 'pending_questionnaire',
        title: 'Νέο Ερωτηματολόγιο',
        message: `Ο πράκτορας ${instance.sender.name} σας έστειλε το ερωτηματολόγιο "${instance.template.name}" για να αξιολογήσει την κάλυψή σας.`,
        relatedObjectType: 'questionnaire',
        relatedObjectId: instance.id,
        channels: ['email', 'push']
    })

    return { success: true, instanceId: instance.id }
}
