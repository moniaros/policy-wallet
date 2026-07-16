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
        orderBy: { createdAt: 'desc' },
        // Safety bound — the client renders the full list, so cap the newest
        // page rather than streaming an unbounded book to the browser.
        take: 500,
    })

    // Score every open/contacted opportunity in one batched pass (was ~8
    // queries per opportunity, capped at 20; now a bounded set for all of them).
    const { scoreOpportunitiesBatch } = await import("@/lib/services/gap-engine/opportunity-scoring")
    let scores = new Map<string, { likelihood: string; score: number }>()
    const openOpps = opportunities.filter(o => o.status === "open" || o.status === "contacted")
    try {
        const scored = await scoreOpportunitiesBatch(openOpps.map(o => o.id))
        scores = new Map([...scored].map(([id, s]) => [id, { likelihood: s.likelihood, score: s.score }]))
    } catch {
        // Best-effort enrichment: scoring is non-critical. On failure every
        // opportunity simply renders unscored.
    }

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
