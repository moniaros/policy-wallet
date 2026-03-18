'use server'

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

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

export async function getActivityFeed(limit = 50): Promise<ActivityEvent[]> {
    const userResult = await getAuthenticatedUserOrNull()
    if (!userResult?.dbUser) return []
    const agentId = userResult.dbUser.id

    const activities: ActivityEvent[] = []

    // 1. Notification Events
    const notifications = await prisma.notificationEvent.findMany({
        where: { userId: agentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    })

    for (const n of notifications) {
        let category: ActivityCategory = 'system'
        if (n.eventType.startsWith('policy_')) category = 'policy'
        else if (n.eventType.startsWith('customer_')) category = 'customer'
        else if (n.eventType.startsWith('opportunity_')) category = 'opportunity'

        activities.push({
            id: `notif_${n.id}`,
            type: n.eventType,
            category,
            title: { en: n.title, el: n.title }, // We rely on DB title currently, can be translated if needed
            description: { en: n.message, el: n.message },
            timestamp: n.createdAt,
            policyId: n.relatedObjectType === 'policy' ? n.relatedObjectId || undefined : undefined,
            customerId: n.relatedObjectType === 'customer' ? n.relatedObjectId || undefined : undefined,
            opportunityId: n.relatedObjectType === 'opportunity' ? n.relatedObjectId || undefined : undefined,
            isUnread: n.status === 'queued' || n.status === 'unread',
        })
    }

    // 2. Customer Relationships (New Activations)
    const relationships = await prisma.customerRelationship.findMany({
        where: { agentUserId: agentId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
    })

    for (const rel of relationships) {
        activities.push({
            id: `rel_${rel.id}_created`,
            type: 'customer_joined',
            category: 'customer',
            title: { en: 'New Customer Connection', el: 'Νέα Σύνδεση Πελάτη' },
            description: { 
                en: `${rel.customer.name || 'User'} is now connected to your practice.`,
                el: `Ο/Η ${rel.customer.name || 'Χρήστης'} συνδέθηκε στο γραφείο σας.`
            },
            timestamp: rel.createdAt,
            customerId: rel.customer.id,
            customerName: rel.customer.name || 'Unknown',
        })

        if (rel.lastInteractionAt && rel.lastInteractionAt.getTime() > rel.createdAt.getTime() + 1000) {
             activities.push({
                id: `rel_${rel.id}_interaction`,
                type: 'customer_interaction',
                category: 'customer',
                title: { en: 'Customer Interaction', el: 'Αλληλεπίδραση Πελάτη' },
                description: { 
                    en: `Interaction recorded with ${rel.customer.name || 'User'}.`,
                    el: `Καταγράφηκε αλληλεπίδραση με τον/την ${rel.customer.name || 'Χρήστη'}.`
                },
                timestamp: rel.lastInteractionAt,
                customerId: rel.customer.id,
                customerName: rel.customer.name || 'Unknown',
            })
        }
    }

    // 3. Opportunities
    const opportunities = await prisma.opportunity.findMany({
        where: { ownerAgentUserId: agentId },
        include: { 
            relationship: { include: { customer: true } },
            policy: true 
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
    })

    for (const opp of opportunities) {
        // Opportunity created
        activities.push({
            id: `opp_${opp.id}_created`,
            type: 'opportunity_created',
            category: 'opportunity',
            title: { en: 'New Opportunity Identified', el: 'Νέα Ευκαιρία' },
            description: { 
                en: `A new opportunity was identified for ${opp.relationship.customer.name}.`,
                el: `Αναγνωρίστηκε νέα ευκαιρία για τον/την ${opp.relationship.customer.name}.`
            },
            timestamp: opp.createdAt,
            customerId: opp.relationship.customer.id,
            customerName: opp.relationship.customer.name || 'Unknown',
            opportunityId: opp.id,
        })

        // Opportunity status change (if updated significantly after creation)
        if (opp.updatedAt.getTime() - opp.createdAt.getTime() > 5000) {
             activities.push({
                id: `opp_${opp.id}_updated`,
                type: opp.status === 'won' ? 'opportunity_won' : opp.status === 'lost' ? 'opportunity_lost' : 'opportunity_updated',
                category: 'opportunity',
                title: { 
                    en: opp.status === 'won' ? 'Opportunity Won!' : `Opportunity Update: ${opp.status}`,
                    el: opp.status === 'won' ? 'Επιτυχής Ευκαιρία!' : `Ενημέρωση Ευκαιρίας: ${opp.status}`
                },
                description: { 
                    en: `Opportunity status changed to ${opp.status} for ${opp.relationship.customer.name}.`,
                    el: `Η ευκαιρία για τον/την ${opp.relationship.customer.name} ενημερώθηκε σε ${opp.status}.`
                },
                timestamp: opp.updatedAt,
                customerId: opp.relationship.customer.id,
                customerName: opp.relationship.customer.name || 'Unknown',
                opportunityId: opp.id,
            })
        }
    }

    // 4. Questionnaire Instances
    const questionnaires = await prisma.questionnaireInstance.findMany({
        where: { sentByUserId: agentId },
        include: { receiver: true, template: true },
        orderBy: { sentAt: 'desc' },
        take: limit,
    })

    for (const q of questionnaires) {
        // Sent
        activities.push({
            id: `q_${q.id}_sent`,
            type: 'questionnaire_sent',
            category: 'customer',
            title: { en: 'Questionnaire Sent', el: 'Αποστολή Ερωτηματολογίου' },
            description: { 
                en: `Sent "${q.template.name}" to ${q.receiver.name}.`,
                el: `Στάλθηκε το ερωτηματολόγιο "${q.template.name}" στον/στην ${q.receiver.name}.`
            },
            timestamp: q.sentAt,
            customerId: q.receiver.id,
            customerName: q.receiver.name || 'Unknown',
        })

        // Completed
        if (q.completedAt) {
            activities.push({
                id: `q_${q.id}_completed`,
                type: 'questionnaire_completed',
                category: 'customer',
                title: { en: 'Questionnaire Completed', el: 'Ολοκλήρωση Ερωτηματολογίου' },
                description: { 
                    en: `${q.receiver.name} completed "${q.template.name}".`,
                    el: `Ο/Η ${q.receiver.name} ολοκλήρωσε το ερωτηματολόγιο "${q.template.name}".`
                },
                timestamp: q.completedAt,
                customerId: q.receiver.id,
                customerName: q.receiver.name || 'Unknown',
            })
        }
    }

    // Sort all events descending by timestamp and return top `limit`
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return activities.slice(0, limit)
}
