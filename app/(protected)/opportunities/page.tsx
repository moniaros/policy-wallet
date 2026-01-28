import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { OpportunitiesClient } from "./OpportunitiesClient"

export default async function OpportunitiesPage() {
    const { dbUser } = await getAuthenticatedUser()

    const opportunities = await db.opportunity.findMany({
        where: { ownerAgentUserId: dbUser.id },
        include: {
            relationship: {
                include: {
                    customer: {
                        select: { name: true, email: true }
                    }
                }
            },
            gapInstance: {
                include: {
                    definition: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const formattedOpportunities = opportunities.map(opp => ({
        id: opp.id,
        customerName: opp.relationship.customer.name || 'Unknown',
        customerEmail: opp.relationship.customer.email || '',
        title: opp.gapInstance?.definition?.title || 'General Opportunity',
        status: opp.status,
        severity: opp.gapInstance?.severity || 'medium',
        nextActionAt: opp.nextActionAt,
        notes: opp.notes,
        policyId: opp.gapInstance?.policyId || null
    }))

    return <OpportunitiesClient initialOpportunities={formattedOpportunities} />
}
