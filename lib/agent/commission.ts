/**
 * Agent commission rates.
 *
 * Agents configure a commission percentage per line of business on
 * `/commissions` (stored as `AgentProfile.commissionRates`, a
 * `Record<lineOfBusiness, percent>`). Every place that turns a premium into an
 * agent-facing money figure must use those real rates — not a hardcoded flat
 * percentage — or the dashboard, the commissions page and the opportunity
 * estimates disagree with each other and with what the agent actually earns.
 */

export type CommissionRates = Record<string, number> | null | undefined

/** Fallback when an agent has not set a rate for a line of business. */
export const DEFAULT_COMMISSION_RATE_PERCENT = 15

/**
 * Commission rate for a line of business as a fraction (e.g. 0.15), using the
 * agent's configured percentage and falling back to the default.
 */
export function commissionRate(rates: CommissionRates, lob: string | null | undefined): number {
    const key = (lob || "other").toLowerCase()
    const percent = rates?.[key] ?? DEFAULT_COMMISSION_RATE_PERCENT
    return percent / 100
}

/** Commission amount for a premium on a given line of business. */
export function commissionOn(
    rates: CommissionRates,
    lob: string | null | undefined,
    premium: number | null | undefined
): number {
    return Number(premium ?? 0) * commissionRate(rates, lob)
}
