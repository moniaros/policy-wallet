'use server'

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { opportunityStatusLabel } from '@/lib/opportunity/status-labels'
import { db as prisma } from '@/lib/db'
import { presentCustomerIdentity } from '@/lib/agent-consent'
import { getVisiblePolicyCountsByOwner } from '@/lib/agent-visibility'
import { presentStoredNotification } from '@/lib/notifications/stored-content'

export type ActivityCategory = 'policy' | 'customer' | 'opportunity' | 'system'

export interface ActivityEvent {
    id: string
    type: string
    category: ActivityCategory
    title: { en: string; el: string }
    description: { en: string; el: string }
    timestamp: Date
    customerId?: string
    customerName?: string
    policyId?: string
    opportunityId?: string
    isUnread?: boolean
}

// Only the columns the feed needs — the old `include: { customer: true }`
// dragged full User rows (taxId, phone, …) server-side, and password /
// emailVerified are the consent signals for the identity rule.
const CUSTOMER_IDENTITY_SELECT = {
    id: true,
    name: true,
    email: true,
    password: true,
    emailVerified: true,
} as const

export async function getActivityFeed(limit = 50): Promise<ActivityEvent[]> {
    const userResult = await getAuthenticatedUserOrNull()
    if (!userResult?.dbUser) return []
    const agentId = userResult.dbUser.id

    const activities: ActivityEvent[] = []

    // Fetch every section first so identity can be resolved in ONE batch.
    const [notifications, relationships, opportunities, questionnaires] = await Promise.all([
        // in_app only. One emission writes one row per channel, so an unscoped
        // read listed the same event two or three times in the feed — once for
        // the in-app card, again for the email — and swept in the `analytics`
        // mirror, whose rows carry a machine code as their title.
        prisma.notificationEvent.findMany({
            where: { userId: agentId, channel: 'in_app' },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }),
        prisma.customerRelationship.findMany({
            where: { agentUserId: agentId },
            select: {
                id: true,
                activationStatus: true,
                createdAt: true,
                lastInteractionAt: true,
                policyholderUserId: true,
                customer: { select: CUSTOMER_IDENTITY_SELECT },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }),
        prisma.opportunity.findMany({
            where: { ownerAgentUserId: agentId },
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                relationship: {
                    select: {
                        activationStatus: true,
                        policyholderUserId: true,
                        customer: { select: CUSTOMER_IDENTITY_SELECT },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
        }),
        prisma.questionnaireInstance.findMany({
            where: { sentByUserId: agentId },
            select: {
                id: true,
                sentAt: true,
                completedAt: true,
                template: { select: { name: true } },
                relationship: { select: { activationStatus: true, policyholderUserId: true } },
                receiver: { select: CUSTOMER_IDENTITY_SELECT },
            },
            orderBy: { sentAt: 'desc' },
            take: limit,
        }),
    ])

    // Identity-consent rule (lib/agent-consent): the feed was an email→name
    // oracle — adding any real user's email as a "customer" echoed their real
    // name back. Every name below now goes through the presenter, keyed on
    // one batched visible-policy count query.
    const customerOwnerIds = [
        ...new Set([
            ...relationships.map((r) => r.policyholderUserId),
            ...opportunities.map((o) => o.relationship.policyholderUserId),
            ...questionnaires.map((q) => q.relationship?.policyholderUserId ?? q.receiver.id),
        ]),
    ]
    const visibleCounts = await getVisiblePolicyCountsByOwner(agentId, customerOwnerIds)
    const nameFor = (
        rel: { activationStatus?: string | null } | null | undefined,
        customer: { id: string; name: string | null; email: string; password: string | null; emailVerified: Date | null },
        ownerUserId: string
    ) => presentCustomerIdentity(rel, customer, visibleCounts.get(ownerUserId) ?? 0).name

    // 1. Notification Events
    for (const n of notifications) {
        let category: ActivityCategory = 'system'
        if (n.eventType.startsWith('policy_')) category = 'policy'
        else if (n.eventType.startsWith('customer_')) category = 'customer'
        else if (n.eventType.startsWith('opportunity_')) category = 'opportunity'

        // Stored title/message are whatever the WRITER of the day put there.
        // Since the Aug 2026 composition cutover every writer supplies
        // bilingual copy (dispatch.ts types it), so new rows pass through in
        // the recipient's language. LEGACY rows that stored internal English
        // documentation ("AI extraction finished and the policy is readable")
        // are substituted with the event's canonical bilingual copy by the
        // shared presenter — derived from the registry, not a hand-written
        // per-event map here, so all event types are covered.
        const presented = presentStoredNotification(n.eventType, n.title, n.message)
        activities.push({
            id: `notif_${n.id}`,
            type: n.eventType,
            category,
            title: presented.title,
            description: presented.message,
            timestamp: n.createdAt,
            policyId: n.relatedObjectType === 'policy' ? n.relatedObjectId || undefined : undefined,
            customerId: n.relatedObjectType === 'customer' ? n.relatedObjectId || undefined : undefined,
            opportunityId: n.relatedObjectType === 'opportunity' ? n.relatedObjectId || undefined : undefined,
            // `readAt` is the one definition of read. This was a THIRD one —
            // `status === 'queued' || status === 'unread'` — and nothing has
            // ever written the status `'unread'`, so half of it was dead.
            isUnread: n.readAt === null,
        })
    }

    // 2. Customer Relationships (New Activations)
    for (const rel of relationships) {
        const label = nameFor(rel, rel.customer, rel.policyholderUserId)
        activities.push({
            id: `rel_${rel.id}_created`,
            type: 'customer_joined',
            category: 'customer',
            title: { en: 'New Customer Connection', el: 'Νέα Σύνδεση Πελάτη' },
            description: {
                en: `${label} is now connected to your practice.`,
                el: `Ο/Η ${label} συνδέθηκε στο γραφείο σας.`
            },
            timestamp: rel.createdAt,
            customerId: rel.customer.id,
            customerName: label,
        })

        if (rel.lastInteractionAt && rel.lastInteractionAt.getTime() > rel.createdAt.getTime() + 1000) {
             activities.push({
                id: `rel_${rel.id}_interaction`,
                type: 'customer_interaction',
                category: 'customer',
                title: { en: 'Customer Interaction', el: 'Αλληλεπίδραση Πελάτη' },
                description: {
                    en: `Interaction recorded with ${label}.`,
                    el: `Καταγράφηκε αλληλεπίδραση με τον/την ${label}.`
                },
                timestamp: rel.lastInteractionAt,
                customerId: rel.customer.id,
                customerName: label,
            })
        }
    }

    // 3. Opportunities
    for (const opp of opportunities) {
        const label = nameFor(
            opp.relationship,
            opp.relationship.customer,
            opp.relationship.policyholderUserId
        )
        // Opportunity created
        activities.push({
            id: `opp_${opp.id}_created`,
            type: 'opportunity_created',
            category: 'opportunity',
            title: { en: 'New Opportunity Identified', el: 'Νέα Ευκαιρία' },
            description: {
                en: `A new opportunity was identified for ${label}.`,
                el: `Αναγνωρίστηκε νέα ευκαιρία για τον/την ${label}.`
            },
            timestamp: opp.createdAt,
            customerId: opp.relationship.customer.id,
            customerName: label,
            opportunityId: opp.id,
        })

        // Opportunity status change (if updated significantly after creation)
        if (opp.updatedAt.getTime() - opp.createdAt.getTime() > 5000) {
             activities.push({
                id: `opp_${opp.id}_updated`,
                type: opp.status === 'won' ? 'opportunity_won' : opp.status === 'lost' ? 'opportunity_lost' : 'opportunity_updated',
                category: 'opportunity',
                title: {
                    en: opp.status === 'won' ? 'Opportunity Won!' : `Opportunity Update: ${opportunityStatusLabel(opp.status).en}`,
                    el: opp.status === 'won' ? 'Επιτυχής Ευκαιρία!' : `Ενημέρωση Ευκαιρίας: ${opportunityStatusLabel(opp.status).el}`
                },
                description: {
                    en: `Opportunity status changed to ${opportunityStatusLabel(opp.status).en} for ${label}.`,
                    el: `Η ευκαιρία για τον/την ${label} ενημερώθηκε σε ${opportunityStatusLabel(opp.status).el}.`
                },
                timestamp: opp.updatedAt,
                customerId: opp.relationship.customer.id,
                customerName: label,
                opportunityId: opp.id,
            })
        }
    }

    // 4. Questionnaire Instances
    for (const q of questionnaires) {
        const label = nameFor(
            q.relationship,
            q.receiver,
            q.relationship?.policyholderUserId ?? q.receiver.id
        )
        // Sent
        activities.push({
            id: `q_${q.id}_sent`,
            type: 'questionnaire_sent',
            category: 'customer',
            title: { en: 'Questionnaire Sent', el: 'Αποστολή Ερωτηματολογίου' },
            description: {
                en: `Sent "${q.template.name}" to ${label}.`,
                el: `Στάλθηκε το ερωτηματολόγιο "${q.template.name}" στον/στην ${label}.`
            },
            timestamp: q.sentAt,
            customerId: q.receiver.id,
            customerName: label,
        })

        // Completed
        if (q.completedAt) {
            activities.push({
                id: `q_${q.id}_completed`,
                type: 'questionnaire_completed',
                category: 'customer',
                title: { en: 'Questionnaire Completed', el: 'Ολοκλήρωση Ερωτηματολογίου' },
                description: {
                    en: `${label} completed "${q.template.name}".`,
                    el: `Ο/Η ${label} ολοκλήρωσε το ερωτηματολόγιο "${q.template.name}".`
                },
                timestamp: q.completedAt,
                customerId: q.receiver.id,
                customerName: label,
            })
        }
    }

    // Sort all events descending by timestamp and return top `limit`
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return activities.slice(0, limit)
}
