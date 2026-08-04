/**
 * Rate arithmetic for the advisor's executive dashboard.
 *
 * Both headline rates measure DECIDED outcomes. Measuring conversion against
 * every opportunity ever opened made the number fall whenever the advisor
 * prospected more — adding ten open opportunities mechanically dropped the
 * rate, so the KPI punished exactly the behaviour the product wants. It also
 * disagreed with the renewal rate rendered beside it, which has always used a
 * decided denominator: two figures labelled "rate" that meant different things.
 *
 * Pure and shared so the two cannot drift apart again.
 */

/** Percentage 0-100, or null when nothing has been decided yet. */
function rate(numerator: number, denominator: number): number | null {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
    if (denominator <= 0) return null
    return Math.round((numerator / denominator) * 100)
}

/**
 * Won as a share of decided opportunities (won + lost).
 *
 * Returns 0 rather than null when nothing is decided, because the dashboard
 * renders this as a bare percentage — but callers that want to distinguish
 * "0% conversion" from "nothing decided yet" should use `hasDecidedOpportunities`.
 */
export function conversionRate(won: number, lost: number): number {
    return rate(won, won + lost) ?? 0
}

export function hasDecidedOpportunities(won: number, lost: number): boolean {
    return won + lost > 0
}

/** Renewed as a share of resolved renewals (renewed + lapsed). */
export function renewalRate(renewed: number, lapsed: number): number {
    return rate(renewed, renewed + lapsed) ?? 0
}
