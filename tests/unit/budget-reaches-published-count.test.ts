import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { AUTHORED_GAP_DEFINITIONS } from '@/lib/gaps/authored-catalogue'
import { estimatePolicyAnalysisTokenBudget } from '@/lib/services/analysis/token-budget-estimator'
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
import type { AgentTier } from '@/types/subscription-entitlements'

/**
 * H-027 rule (owner, 2026-10-22): the PUBLISHED analysis count is the cap; `monthlyTokenBudget` is a
 * safety rail that must never bind before it. A run is admitted iff used + reservation <= budget
 * (lib/token-tracking.ts:398). createRun checks the whole-run estimate R without reserving; each step
 * then reserves its own slice (<= 102,000) and replaces it with actual usage. N × R is therefore a
 * conservative bound at the ESTIMATE; recorded actuals are what the p95 SQL measures (H-027). Therefore for each agent plan:
 *     monthlyTokenBudget  >=  aiAnalysesPerMonth × R_max
 * where R_max is the largest per-run reservation over every branch of the authored gap catalogue
 * (estimatePolicyAnalysisTokenBudget — the estimator the gate itself uses). The owner sets the
 * production budgets as N × 151,200 + ~10 % (151,200 = R for an 8-rule branch).
 * Family is excluded: its budget waits for the owner's production query.
 */
const TIERS = Object.keys(DEFAULT_AGENT_ENTITLEMENT_LIMITS) as AgentTier[]

function maxReservation(): number {
    const counts = new Map<string, number>()
    for (const d of AUTHORED_GAP_DEFINITIONS) if (d.isActive) counts.set(d.lineOfBusiness, (counts.get(d.lineOfBusiness) ?? 0) + 1)
    const rules = Math.max(...counts.values(), 0)
    return estimatePolicyAnalysisTokenBudget({ hasDocument: true, gapDefinitionsCount: rules, checklistPillarsCount: 8 }).totalEstimatedTokens
}

describe('an agent plan\'s token budget never binds before its published analysis count (H-027)', () => {
    const R = maxReservation()

    it('R_max is the 8-rule branch reservation, 151,200 tokens', () => {
        expect(R).toBe(151_200)
    })

    it.each(TIERS)('%s: budget >= published count × R_max (all runs reserving concurrently)', (tier) => {
        const l = DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier]
        expect(l.aiAnalysesPerMonth, `${tier} must publish a finite count`).toBeTypeOf('number')
        const need = (l.aiAnalysesPerMonth as number) * R
        expect(l.monthlyTokenBudget, `${tier}: ${l.aiAnalysesPerMonth} × ${R} = ${need}`).toBeGreaterThanOrEqual(need)
    })

    it('the code defaults equal the budgets the owner set in production (fixture)', () => {
        const prod = JSON.parse(readFileSync('tests/fixtures/production-plan-rows-2026-10-22.json', 'utf-8')).agent
        for (const tier of TIERS) expect(DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier].monthlyTokenBudget, tier).toBe(prod[tier].monthlyTokenBudget)
    })

    it('probe: the old defaults (150,000 / 1.6M / 4.5M / 12M) fail the rule for every plan', () => {
        const old: Record<string, number> = { agent_free: 150_000, agent_starter: 1_600_000, agent_pro: 4_500_000, agency: 12_000_000 }
        for (const tier of TIERS) {
            const need = (DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier].aiAnalysesPerMonth as number) * R
            expect(old[tier] >= need, `${tier} old budget ${old[tier]} vs ${need}`).toBe(false)
        }
    })
})
