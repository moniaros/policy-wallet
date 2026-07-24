import { normalizeBranch } from "@/lib/insurance/taxonomy"

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
 *
 * A CHILD branch inherits its parent's rate. `/agent/settings` offers exactly
 * eight lines to configure — motor, home, health, life, travel, pet, liability,
 * legal expenses — while policies and opportunities carry the taxonomy's full
 * vocabulary, where motorbike and truck sit under motor, renters under home, and
 * income protection, disability and personal accident under life.
 *
 * Matching the id exactly meant every one of those fell through to the 15%
 * default. An agent who had set motor at 10% saw 15% on each motorbike in their
 * own commission report — half again what they actually earn — with nothing to
 * indicate a fallback had been used. Most specific wins: the exact key first, the
 * parent branch next, the default last.
 */
export function commissionRate(rates: CommissionRates, lob: string | null | undefined): number {
    const key = (lob || "other").toLowerCase()
    const parentKey = (normalizeBranch(key).parentId ?? key).toLowerCase()
    const percent = rates?.[key] ?? rates?.[parentKey] ?? DEFAULT_COMMISSION_RATE_PERCENT
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
