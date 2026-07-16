import { selectPremiumBearingPolicies, type PremiumPolicyLike } from "@/lib/wallet/premium-footprint"
import { commissionOn, type CommissionRates } from "@/lib/agent/commission"

/**
 * Agent book revenue (the dashboard "Μηνιαία Έσοδα" figure).
 *
 * Two guards keep it honest:
 *  1. Dedupe — re-uploads of the same policy number are one economic exposure,
 *     so the in-force set comes off `selectPremiumBearingPolicies` (which
 *     collapses same-number rows) rather than summing every raw row. Without
 *     this, three duplicate uploads counted a policy's commission three times.
 *  2. Sanity guard — a `premiumAmount` above this ceiling is almost certainly a
 *     mis-extraction (a sum-insured / coverage limit captured as the premium),
 *     so it is excluded from revenue. One bad OCR must not blow up the KPI.
 */
export const MAX_PLAUSIBLE_ANNUAL_PREMIUM = 100_000

export interface AgentBookRevenue {
    /** Deduped in-force annual premium (excludes implausible mis-extractions). */
    dedupedPremium: number
    annualCommission: number
    monthlyCommission: number
    /** Priced in-force policies that contributed (deduped, plausible premium). */
    policyCount: number
}

export function computeAgentBookRevenue<
    T extends PremiumPolicyLike & { lineOfBusiness?: string | null }
>(policies: T[], rates: CommissionRates, now: Date = new Date()): AgentBookRevenue {
    // In-force policies with duplicate uploads (same number) collapsed.
    const inForce = selectPremiumBearingPolicies(policies, now).policies

    // Drop implausible premiums (sum-insured mis-extracted as premium).
    const priced = inForce.filter((p) => {
        const premium = Number(p.premiumAmount ?? 0)
        return Number.isFinite(premium) && premium > 0 && premium <= MAX_PLAUSIBLE_ANNUAL_PREMIUM
    })

    const dedupedPremium = priced.reduce((sum, p) => sum + Number(p.premiumAmount ?? 0), 0)
    const annualCommission = priced.reduce(
        (sum, p) => sum + commissionOn(rates, p.lineOfBusiness, Number(p.premiumAmount ?? 0)),
        0
    )

    return {
        dedupedPremium,
        annualCommission,
        monthlyCommission: annualCommission / 12,
        policyCount: priced.length,
    }
}
