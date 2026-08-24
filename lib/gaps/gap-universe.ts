/**
 * WHICH gap instances a portfolio-level surface may count — one predicate.
 *
 * The product decision is recorded on /coverage-insights: "coverage insights
 * describe the protection you have TODAY. A lapsed policy is not protection —
 * its findings must not be presented as your current coverage picture (they
 * stay on that policy's own page)." The dashboard's severity tally ignored it
 * and counted every open gap the owner had ever accumulated, so the widget
 * said 43 while the page it links to said 33 (§2.8). Same fact, two universes.
 *
 * This helper is that predicate, importable, so the two surfaces cannot
 * drift again. Selection only — it decides which EXISTING GapInstance rows a
 * page may count, never whether a gap exists (that is `decideGapsForPolicy`,
 * untouchable) nor how severe it is.
 *
 * Profile-level gaps (no policyId) pass through: they are about the person,
 * not a policy, so no lapse can retire them.
 */

import { isPolicyCoverageActive } from "@/lib/policy-status"

interface GapLike {
    policyId?: string | null
}

interface PolicyLike {
    id: string
    status?: string | null
    policyNumber?: string | null
    insurerName?: string | null
    endDate?: Date | string | null
    acordData?: unknown
}

/** Ids of the policies that provide coverage today. */
export function activeCoveragePolicyIds(
    policies: PolicyLike[],
    now: Date = new Date()
): Set<string> {
    return new Set(
        policies
            .filter((policy) => isPolicyCoverageActive(policy, now))
            .map((policy) => policy.id)
    )
}

/** The gaps a portfolio surface may count: on active coverage, or profile-level. */
export function gapsOnActiveCoverage<T extends GapLike>(
    gaps: T[],
    policies: PolicyLike[],
    now: Date = new Date()
): T[] {
    const liveIds = activeCoveragePolicyIds(policies, now)
    return gaps.filter((gap) => !gap.policyId || liveIds.has(gap.policyId))
}
