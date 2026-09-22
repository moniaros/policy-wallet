/**
 * An advisor's book, measured in protection.
 *
 * Scores every household the advisor is connected to, ranks by advisory impact,
 * and rolls the same numbers into the executive view — so the summary at the top
 * and the queue beneath it cannot disagree.
 *
 * **Bounded on purpose.** A book is scored by computing the full risk
 * intelligence per household, which is a graph projection and a catalog pass
 * each. That is fine for tens and wrong for thousands, so the read is capped and
 * says so rather than quietly truncating — the same rule the risk graph follows
 * about silent caps.
 */

import { db } from "@/lib/db"
import { ENDED_RELATIONSHIP_STATUSES, getVisiblePolicyCountsByOwner } from "@/lib/agent-visibility"
import { presentCustomerIdentity } from "@/lib/agent-consent"
import { passwordPresence } from "@/lib/services/credential-signals"
import { getRiskIntelligence } from "./service"
import { advisoryImpact, bookOverview, type AdvisoryImpact, type BookOverview } from "./advisory-impact"

/** Above this, the page reports that it is showing a window. */
export const BOOK_SCORING_LIMIT = 20

export interface ScoredHousehold {
    userId: string
    name: string
    impact: AdvisoryImpact
    healthIndex: number | null
    dependantCount: number
    openDimensions: number
}

export interface BookResult {
    overview: BookOverview
    households: ScoredHousehold[]
    /** Total connected, which may exceed what was scored. */
    totalCustomers: number
    /** True when the book is larger than one page can honestly score. */
    truncated: boolean
    page: number
    failedCount: number
    hasNextPage: boolean
}

export async function getAdvisorBook(agentUserId: string, now: Date = new Date(), requestedPage = 1): Promise<BookResult> {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1
    const where = { agentUserId, status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] } }
    const [scoped, totalCustomers] = await Promise.all([
        db.customerRelationship.findMany({
            where,
            select: {
                policyholderUserId: true, activationStatus: true,
                customer: { select: { name: true, email: true, emailVerified: true } },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * BOOK_SCORING_LIMIT,
            take: BOOK_SCORING_LIMIT,
        }),
        db.customerRelationship.count({ where }),
    ])
    const ids = scoped.map(r => r.policyholderUserId)
    const [counts, credentials] = await Promise.all([
        getVisiblePolicyCountsByOwner(agentUserId, ids), passwordPresence(db, ids),
    ])
    let failedCount = 0

    const households: ScoredHousehold[] = []
    for (const relationship of scoped) {
        try {
            const intelligence = await getRiskIntelligence(relationship.policyholderUserId, now, agentUserId)
            const worsening = intelligence.dimensions.filter((d) => d.trend === "worsening").length
            households.push({
                userId: relationship.policyholderUserId,
                // Email as the fallback identity: an unnamed customer still has
                // to be findable, and "Unknown" is not a person an advisor can call.
                name: presentCustomerIdentity(relationship, { ...relationship.customer, hasPassword: credentials.has(relationship.policyholderUserId) }, counts.get(relationship.policyholderUserId) ?? 0).name,
                impact: advisoryImpact({
                    userId: relationship.policyholderUserId,
                    dimensions: intelligence.dimensions,
                    health: intelligence.health,
                    dependantCount: intelligence.household.dependantCount,
                    worsening,
                }),
                healthIndex: intelligence.health.index,
                dependantCount: intelligence.household.dependantCount,
                openDimensions: intelligence.dimensions.filter((d) => d.openCount > 0).length,
            })
        } catch (error) {
            // One unreadable household must not empty an advisor's whole queue.
            failedCount += 1
        }
    }

    households.sort((a, b) => b.impact.impact - a.impact.impact || a.name.localeCompare(b.name))

    const peopleCovered = households.reduce((sum, h) => sum + 1 + h.dependantCount, 0)
    const worseningHouseholds = households.filter((h) => h.impact.whatChanged !== null).length

    return {
        overview: bookOverview(
            households.map((h) => h.impact),
            households.map((h) => ({ index: h.healthIndex }) as any),
            peopleCovered,
            worseningHouseholds,
            households.reduce((sum, h) => sum + h.openDimensions, 0)
        ),
        households,
        totalCustomers,
        truncated: totalCustomers > scoped.length,
        page, failedCount,
        hasNextPage: page * BOOK_SCORING_LIMIT < totalCustomers,
    }
}
