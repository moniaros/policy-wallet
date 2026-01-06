"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getNotificationData() {
    const session = await auth()
    if (!session?.user?.id) return null

    const userId = session.user.id

    // 1. Fetch History
    const history = await db.notificationEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    })

    // 2. Fetch Preferences
    const preferences = await db.notificationPreference.findMany({
        where: { userId }
    })

    // 3. Fetch Policies (for filtering)
    const policies = await db.policy.findMany({
        where: { ownerUserId: userId },
        select: {
            id: true,
            policyNumber: true,
            insurerName: true,
            lineOfBusiness: true,
            endDate: true,
            status: true,
            ownerUserId: true
        }
    })

    // 4. Fetch Customer Relationships (if agent)
    const customerRelationships = await db.customerRelationship.findMany({
        where: { agentUserId: userId },
        include: {
            customer: {
                select: { name: true }
            }
        }
    })

    // 5. Get User Info
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            roles: true,
            createdAt: true
        }
    })

    if (!user) return null

    // Transform for UI (Bridging snake_case and handling roles correctly)
    const uiUser = {
        user_id: user.id,
        email: user.email!, // assumed as per types
        preferred_language: 'el' as const, // default for now
        role: user.roles,
        created_at: user.createdAt.toISOString()
    }

    const uiEvents = history.map(e => ({
        event_id: e.id,
        user_id: e.userId,
        event_type: e.eventType,
        event_category: 'system_confirmation' as 'system_confirmation' | 'reminder' | 'intelligence' | 'agent_action',
        channel: e.channel as 'email' | 'push' | 'whatsapp' | 'viber',
        status: e.status as 'sent' | 'failed' | 'queued',
        subject: e.title,
        message: e.message,
        related_policy_id: (e.relatedObjectId && e.relatedObjectType === 'policy' ? e.relatedObjectId : null) as string | null,
        related_policy_name: null as string | null,
        related_customer_relationship_id: (e.relatedObjectId && e.relatedObjectType === 'customer' ? e.relatedObjectId : null) as string | null,
        related_customer_name: null as string | null,
        sent_at: e.sentAt?.toISOString() || null,
        created_at: e.createdAt.toISOString()
    }))

    // Enrich event names
    uiEvents.forEach(e => {
        if (e.related_policy_id) {
            const p = policies.find(p => p.id === e.related_policy_id)
            if (p) e.related_policy_name = `${p.insurerName} (${p.policyNumber})`
        }
        if (e.related_customer_relationship_id) {
            const r = customerRelationships.find(r => r.id === e.related_customer_relationship_id)
            if (r) e.related_customer_name = r.customer.name
        }
    })

    const uiPolicies = policies.map(p => ({
        policy_id: p.id,
        owner_user_id: p.ownerUserId,
        policy_number: p.policyNumber,
        insurer_name: p.insurerName,
        line_of_business: p.lineOfBusiness as any,
        end_date: p.endDate.toISOString(),
        status: p.status as any
    }))

    const uiRelationships = customerRelationships.map(r => ({
        relationship_id: r.id,
        agent_user_id: r.agentUserId,
        policyholder_user_id: r.policyholderUserId,
        status: 'active' as const,
        created_at: r.createdAt.toISOString()
    }))

    const uiPreferences = preferences.map(p => ({
        preference_id: p.id,
        user_id: p.userId,
        role: 'policyholder' as const, // We'll need to handle dual roles better later
        event_category: 'reminder' as const, // Fallback
        event_type: p.eventType,
        channel_email: p.channel === 'email' ? p.enabled : true,
        channel_push: p.channel === 'push' ? p.enabled : true,
        always_sent: false,
        updated_at: p.updatedAt.toISOString()
    }))

    return {
        user: uiUser,
        history: uiEvents,
        policies: uiPolicies,
        relationships: uiRelationships,
        preferences: uiPreferences
    }
}

export async function toggleNotificationPreference(eventType: string, channel: 'email' | 'push', enabled: boolean, role: 'policyholder' | 'agent') {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await db.notificationPreference.upsert({
        where: {
            userId_eventType_channel: {
                userId: session.user.id,
                eventType,
                channel
            }
        },
        update: { enabled },
        create: {
            userId: session.user.id,
            eventType,
            channel,
            enabled
        }
    })

    revalidatePath("/notifications")
    return { success: true }
}
