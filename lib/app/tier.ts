/**
 * Tier assignment — WHEN to look, never how bad (§9).
 *
 *   now    — expiry ≤ 14 days; a confirmed gap on a primary asset (home,
 *            primary vehicle, health of a dependant) where the user's own
 *            profile supports the exposure; a review item blocking a `now`
 *            finding
 *   month  — expiry ≤ 45 days; a price change above the published index; a
 *            missing-limit review
 *   later  — everything else
 *
 * Ties are broken by expiry date. The dashboard caps `now` at three and states
 * the overflow count rather than hiding it.
 */
import type { FindingKind, Tier } from "./state"

export const NOW_EXPIRY_DAYS = 14
export const MONTH_EXPIRY_DAYS = 45
export const NOW_CAP = 3

export interface TierInput {
    kind: FindingKind
    daysUntilExpiry: number | null
    /** The rule fired on explicit evidence (is_false/all_false), not on silence. */
    confirmedGap?: boolean
    /** Home, primary vehicle, or the health of a dependant. */
    onPrimaryAsset?: boolean
    /** The user ENTERED the fact that creates the exposure (address, dependants…). */
    profileSupportsExposure?: boolean
    /** A review item whose resolution decides a `now` finding. */
    blocksNowFinding?: boolean
    /** Premium increase above the published index (ΕΛΣΤΑΤ health index etc.). */
    priceChangeAboveIndex?: boolean
    /** A limit the document should state and does not. */
    missingLimit?: boolean
}

export function assignTier(f: TierInput): Tier {
    const days = f.daysUntilExpiry
    if (f.kind === "expiry" && days !== null && days <= NOW_EXPIRY_DAYS) return "now"
    if (f.kind === "gap" && f.confirmedGap && f.onPrimaryAsset && f.profileSupportsExposure) return "now"
    if (f.kind === "review" && f.blocksNowFinding) return "now"

    if (f.kind === "expiry" && days !== null && days <= MONTH_EXPIRY_DAYS) return "month"
    if (f.priceChangeAboveIndex) return "month"
    if (f.kind === "review" && f.missingLimit) return "month"

    return "later"
}

const TIER_RANK: Record<Tier, number> = { now: 0, month: 1, later: 2 }

/** Stable ordering: tier, then soonest expiry (unknown expiry last), then id. */
export function sortByTier<T extends { tier: Tier; daysUntilExpiry?: number | null; id: string }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => {
        const t = TIER_RANK[a.tier] - TIER_RANK[b.tier]
        if (t !== 0) return t
        const da = a.daysUntilExpiry ?? Number.POSITIVE_INFINITY
        const db = b.daysUntilExpiry ?? Number.POSITIVE_INFINITY
        if (da !== db) return da - db
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
}

/** The dashboard's `now` list: at most `cap`, plus how many were left out. */
export function capNow<T extends { tier: Tier; daysUntilExpiry?: number | null; id: string }>(
    items: readonly T[],
    cap: number = NOW_CAP
): { shown: T[]; overflow: number } {
    const now = sortByTier(items).filter((i) => i.tier === "now")
    return { shown: now.slice(0, cap), overflow: Math.max(now.length - cap, 0) }
}
