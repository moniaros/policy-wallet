export const runtime = 'nodejs'

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

    // Batch-score open/contacted opportunities
    const { scoreOpportunity } = await import("@/lib/services/gap-engine/opportunity-scoring")
    const scores = new Map<string, { likelihood: string; score: number }>()
    const openOpps = opportunities.filter(o => o.status === "open" || o.status === "contacted")
    await Promise.all(
        openOpps.slice(0, 20).map(async (opp) => {
            try {
                const result = await scoreOpportunity(opp.id)
                scores.set(opp.id, { likelihood: result.likelihood, score: result.score })
            } catch {
                // Best-effort enrichment: scoring is non-critical. On failure the
                // opportunity is simply omitted from the scores map (renders unscored).
            }
        })
    )

    const formattedOpportunities = opportunities.map(opp => {
        const scored = scores.get(opp.id)
        return {
            id: opp.id,
            customerName: opp.relationship.customer.name || 'Unknown',
            customerEmail: opp.relationship.customer.email || '',
            title: opp.gapInstance?.definition?.title || 'General Opportunity',
            status: opp.status,
            severity: opp.gapInstance?.severity || 'medium',
            nextActionAt: opp.nextActionAt,
            notes: opp.notes,
            policyId: opp.gapInstance?.policyId || null,
            conversionLikelihood: (scored?.likelihood as "high" | "medium" | "low") || null,
            conversionScore: scored?.score ?? null,
        }
    })

    return <OpportunitiesClient initialOpportunities={formattedOpportunities} />
}
