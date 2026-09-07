export const runtime = 'nodejs'

import { hasPasswordCredential, passwordPresence } from "@/lib/services/credential-signals"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { presentCustomerIdentity } from "@/lib/agent-consent"
import { getVisiblePolicyCountsByOwner } from "@/lib/agent-visibility"
import { OpportunitiesClient } from "./OpportunitiesClient"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

export default async function OpportunitiesPage() {
    const { dbUser } = await getAuthenticatedUser()

    const opportunities = await db.opportunity.findMany({
        where: { ownerAgentUserId: dbUser.id },
        include: {
            relationship: {
                select: {
                    activationStatus: true,
                    policyholderUserId: true,
                    // password/emailVerified: consent signals for the identity
                    // rule (lib/agent-consent) — never serialized to the client.
                    customer: {
                        select: { id: true, name: true, email: true, emailVerified: true }
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

    // Identity-consent rule: an unconsented real account's name must not
    // render — the email (which the agent typed) stands in.
    const visibleCounts = await getVisiblePolicyCountsByOwner(
        dbUser.id,
        [...new Set(opportunities.map(o => o.relationship.policyholderUserId))]
    )

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

    // Credential PRESENCE for the identity rule — never the hash (A-01).
    const credentialPresence = await passwordPresence(db, opportunities.map((o) => o.relationship.customer.id))
    const formattedOpportunities = opportunities.map(opp => {
        const scored = scores.get(opp.id)
        const identity = presentCustomerIdentity(
            opp.relationship,
            { ...opp.relationship.customer, hasPassword: credentialPresence.has(opp.relationship.customer.id) },
            visibleCounts.get(opp.relationship.policyholderUserId) ?? 0
        )
        return {
            id: opp.id,
            customerName: identity.name,
            customerEmail: opp.relationship.customer.email || '',
            title: opp.gapInstance?.definition?.title || 'General Opportunity',
            status: opp.status,
            severity: opp.gapInstance?.severity || 'medium',
            nextActionAt: opp.nextActionAt,
            notes: opp.notes,
            policyId: opp.gapInstance?.policyId || null,
            conversionLikelihood: (scored?.likelihood as "high" | "medium" | "low") || null,
            conversionScore: scored?.score ?? null,
            // MEDIC qualification (blueprint §F): sortable scalar beside the
            // sales-likelihood score + the snapshot for the modal scorecard.
            medicScore: opp.medicScore ?? null,
            medic: (opp.medic as import("@/lib/medic/types").MedicData | null) ?? null,
        }
    })

    return (
        <>
            <OpportunitiesClient initialOpportunities={formattedOpportunities} />
            {/* Opportunities are generated from AI gap detection — informational. */}
            <div className="mx-auto max-w-page px-4 sm:px-6 pb-10">
                <AiDisclaimer />
            </div>
        </>
    )
}
