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
import { getRiskIntelligence } from "./service"
import { advisoryImpact, bookOverview, type AdvisoryImpact, type BookOverview } from "./advisory-impact"

/** Above this, the page reports that it is showing a window. */
export const BOOK_SCORING_LIMIT = 60

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
}

export async function getAdvisorBook(agentUserId: string, now: Date = new Date()): Promise<BookResult> {
    const relationships = await db.customerRelationship.findMany({
        where: { agentUserId, status: "active" },
        select: {
            policyholderUserId: true,
            customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    })

    const scoped = relationships.slice(0, BOOK_SCORING_LIMIT)

    const households: ScoredHousehold[] = []
    for (const relationship of scoped) {
        try {
            const intelligence = await getRiskIntelligence(relationship.policyholderUserId, now)
            const worsening = intelligence.dimensions.filter((d) => d.trend === "worsening").length
            households.push({
                userId: relationship.policyholderUserId,
                // Email as the fallback identity: an unnamed customer still has
                // to be findable, and "Unknown" is not a person an advisor can call.
                name: relationship.customer?.name || relationship.customer?.email || relationship.policyholderUserId,
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
            console.error(`Book scoring failed for ${relationship.policyholderUserId}:`, error)
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
            worseningHouseholds
        ),
        households,
        totalCustomers: relationships.length,
        truncated: relationships.length > scoped.length,
    }
}
