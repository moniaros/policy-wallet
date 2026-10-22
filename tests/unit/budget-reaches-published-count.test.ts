import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { AUTHORED_GAP_DEFINITIONS } from '@/lib/gaps/authored-catalogue'
import { estimatePolicyAnalysisTokenBudget } from '@/lib/services/analysis/token-budget-estimator'
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
import { DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
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
 *
 * Round 6 (owner, 2026-10-22) — INTERIM budgets, to be replaced by measured ones (QUEUE BUDGET-MEASURE, a GA
 * blocker): production runs AGENT_INDEPENDENT_VERIFICATION=1, so an agent run also reserves a SECOND
 * extraction (independent-verification.ts: 102,000), i.e. R_agent = R + 102,000; and Family's budget is
 * analyses for a full wallet (25 policies × R) PLUS an allowance for interactive Q&A (100 questions × the
 * 15,000 headroom the Q&A gate asks for, wallet/actions.ts:1778).
 */
const TIERS = Object.keys(DEFAULT_AGENT_ENTITLEMENT_LIMITS) as AgentTier[]
// The second extraction an agent run reserves when AGENT_INDEPENDENT_VERIFICATION=1 (production). The constant is
// local to independent-verification.ts, so the test pins it to the source.
const VERIFICATION_RESERVATION = 102_000
// Questions per month the Family budget must leave room for, and the headroom the Q&A gate checks per question.
const QA_QUESTIONS = 100
const QA_UNIT = 15_000

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

    it('the constants this rule leans on still exist in the source', () => {
        expect(readFileSync('lib/services/analysis/independent-verification.ts', 'utf-8')).toContain('const reservation = 102_000')
        expect(readFileSync('app/(protected)/wallet/actions.ts', 'utf-8')).toContain('canUserUseTokens(authResult.dbUser.id, 15000)')
    })

    it.each(TIERS)('%s: budget >= published count × (R_max + the verification reservation)', (tier) => {
        const l = DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier]
        expect(l.aiAnalysesPerMonth, `${tier} must publish a finite count`).toBeTypeOf('number')
        const need = (l.aiAnalysesPerMonth as number) * (R + VERIFICATION_RESERVATION)
        expect(l.monthlyTokenBudget, `${tier}: ${l.aiAnalysesPerMonth} × (${R} + ${VERIFICATION_RESERVATION}) = ${need}`).toBeGreaterThanOrEqual(need)
    })

    it('pro (Family): budget >= policy cap × R_max + the Q&A allowance', () => {
        const l = DEFAULT_ENTITLEMENT_LIMITS.pro
        expect(l.policies, 'Family must have a finite policy cap').toBeTypeOf('number')
        const need = (l.policies as number) * R + QA_QUESTIONS * QA_UNIT
        expect(l.monthlyTokenBudget, `pro: ${l.policies} × ${R} + ${QA_QUESTIONS} × ${QA_UNIT} = ${need}`).toBeGreaterThanOrEqual(need)
    })

    it('Free and Plus keep their own rail: nothing in this rule raises them (they never reach the gate)', () => {
        expect(DEFAULT_ENTITLEMENT_LIMITS.free.monthlyTokenBudget).toBe(150_000)
        expect(DEFAULT_ENTITLEMENT_LIMITS.plus.monthlyTokenBudget).toBe(600_000)
    })

    it('the code defaults equal the budgets the owner set in production (fixture)', () => {
        const prod = JSON.parse(readFileSync('tests/fixtures/production-plan-rows-2026-10-22.json', 'utf-8')).agent
        for (const tier of TIERS) expect(DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier].monthlyTokenBudget, tier).toBe(prod[tier].monthlyTokenBudget)
        const pro = JSON.parse(readFileSync('tests/fixtures/production-plan-rows-2026-10-22.json', 'utf-8')).policyholder.pro
        expect(DEFAULT_ENTITLEMENT_LIMITS.pro.monthlyTokenBudget).toBe(pro.monthlyTokenBudget)
    })

    it('probe: the round-5 agent budgets (850,000 / 8.4M / 25M / 67M) and Family 1.5M fail the round-6 rule', () => {
        const old: Record<string, number> = { agent_free: 850_000, agent_starter: 8_400_000, agent_pro: 25_000_000, agency: 67_000_000 }
        for (const tier of TIERS) {
            const need = (DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier].aiAnalysesPerMonth as number) * (R + VERIFICATION_RESERVATION)
            expect(old[tier] >= need, `${tier} round-5 budget ${old[tier]} vs ${need}`).toBe(false)
        }
        expect(1_500_000 >= (DEFAULT_ENTITLEMENT_LIMITS.pro.policies as number) * R + QA_QUESTIONS * QA_UNIT).toBe(false)
    })
})
