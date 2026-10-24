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
 * blocker): the owner sizes for AGENT_INDEPENDENT_VERIFICATION=1 (the Vercel production env names listed no such variable on 2026-10-23, so budgets are an upper bound until it is set), so an agent run also reserves a SECOND
 * extraction (independent-verification.ts: 102,000), i.e. R_agent = R + 102,000; and Family's budget is
 * analyses for a full wallet (25 policies × R) PLUS an allowance for interactive Q&A (100 questions × the
 * 15,000 headroom the Q&A gate asks for, wallet/actions.ts:1778).
 * NOT covered by this rule (QUEUE AGENT-BUDGET-OTHER-DRAWS / BUDGET-MEASURE): the scan-time / upload-time
 * extraction (agent/actions.ts:1501, api/policies/extract/route.ts:293) is RECORDED against the same monthly row
 * (not budget-gated), about 102,000 per document when the run cannot reuse the scan cache; MEDIC, the review
 * workspace, agent Q&A and batch translation likewise. The rule sizes the analyses; measurement sizes the month.
 *
 * Round 7 (owner, 2026-10-23) — FINAL interim budgets; budget sizing ends here (further findings go to BUDGET-MEASURE).
 * The scan/upload extraction is now INSIDE the rule, as the cache-miss path: an agent analysis costs
 *     R_max + the scan/upload extraction (102,000) + the verification reservation (102,000) = 355,200
 * and the Family batch path (a full wallet of 25 policies, each uploaded then analysed) costs 25 × (R_max + 102,000) = 25 × 253,200,
 * both with 10 % headroom:
 *     agent:   budget >= N × 355,200 × 1.1
 *     Family:  budget >= (policies × 253,200 + 100 × 15,000) × 1.1
 * BUDGET-MEASURE replaces every interim value before GA; its A_p95 must include the ungated scan/upload extraction and
 * the verification actuals.
 */
const TIERS = Object.keys(DEFAULT_AGENT_ENTITLEMENT_LIMITS) as AgentTier[]
// The second extraction an agent run reserves when AGENT_INDEPENDENT_VERIFICATION=1. The constant is
// local to independent-verification.ts, so the test pins it to the source.
const VERIFICATION_RESERVATION = 102_000
// Questions per month the Family budget must leave room for, and the headroom the Q&A gate checks per question.
const QA_QUESTIONS = 100
const QA_UNIT = 15_000
// The ungated scan/upload extraction (agent/actions.ts, api/policies/extract/route.ts) recorded on the same row, taken at the
// same size as the verification extraction; and the owner's headroom.
const SCAN_UPLOAD_EXTRACTION = 102_000
const HEADROOM = 1.1
// Family: a full wallet uploaded through the batch route (about 102,000 per document, ungated), then deep-analysed. Policyholder runs are NOT independently verified.
const UPLOAD_EXTRACTION_FAMILY = 102_000

function maxReservation(): number {
    const counts = new Map<string, number>()
    for (const d of AUTHORED_GAP_DEFINITIONS) if (d.isActive) counts.set(d.lineOfBusiness, (counts.get(d.lineOfBusiness) ?? 0) + 1)
    const rules = Math.max(...counts.values(), 0)
    return estimatePolicyAnalysisTokenBudget({ hasDocument: true, gapDefinitionsCount: rules, checklistPillarsCount: 8 }).totalEstimatedTokens
}

// R is the estimator's own largest reservation (maxReservation), never a literal: a grown catalogue raises the need.
const agentNeed = (n: number, r = maxReservation()) => Math.round(n * (r + SCAN_UPLOAD_EXTRACTION + VERIFICATION_RESERVATION) * HEADROOM)
const familyNeed = (policies: number, r = maxReservation()) => Math.round((policies * (r + UPLOAD_EXTRACTION_FAMILY) + QA_QUESTIONS * QA_UNIT) * HEADROOM)

describe('an agent plan\'s token budget never binds before its published analysis count (H-027)', () => {
    const R = maxReservation()

    it('R_max is the 8-rule branch reservation, 151,200 tokens', () => {
        expect(R).toBe(151_200)
    })

    it('the constants this rule leans on still exist in the source', () => {
        expect(readFileSync('lib/services/analysis/independent-verification.ts', 'utf-8')).toContain('const reservation = 102_000')
        expect(readFileSync('app/(protected)/wallet/actions.ts', 'utf-8')).toContain('canUserUseTokens(authResult.dbUser.id, 15000)')
    })

    it.each(TIERS)('%s: budget >= published count × (R_max + scan/upload + verification) × 1.1 (cache-miss path)', (tier) => {
        const l = DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier]
        expect(l.aiAnalysesPerMonth, `${tier} must publish a finite count`).toBeTypeOf('number')
        const need = agentNeed(l.aiAnalysesPerMonth as number)
        expect(l.monthlyTokenBudget, `${tier}: ${l.aiAnalysesPerMonth} × (${R} + ${SCAN_UPLOAD_EXTRACTION} + ${VERIFICATION_RESERVATION}) × ${HEADROOM} = ${need}`).toBeGreaterThanOrEqual(need)
    })

    it('pro (Family): budget >= (policy cap × (R_max + upload extraction) + the Q&A allowance) × 1.1', () => {
        const l = DEFAULT_ENTITLEMENT_LIMITS.pro
        expect(l.policies, 'Family must have a finite policy cap').toBeTypeOf('number')
        const need = familyNeed(l.policies as number)
        expect(l.monthlyTokenBudget, `pro: (${l.policies} × (${R} + ${UPLOAD_EXTRACTION_FAMILY}) + ${QA_QUESTIONS} × ${QA_UNIT}) × ${HEADROOM} = ${need}`).toBeGreaterThanOrEqual(need)
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

    it('probe: the round-6 budgets (1.7M / 16.8M / 50M / 134M) and Family 5.7M fail the round-7 rule', () => {
        const old: Record<string, number> = { agent_free: 1_700_000, agent_starter: 16_800_000, agent_pro: 50_000_000, agency: 134_000_000 }
        for (const tier of TIERS) {
            const need = agentNeed(DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier].aiAnalysesPerMonth as number)
            expect(old[tier] >= need, `${tier} round-6 budget ${old[tier]} vs ${need}`).toBe(false)
        }
        expect(5_700_000 >= familyNeed(DEFAULT_ENTITLEMENT_LIMITS.pro.policies as number)).toBe(false)
    })

    it('the rule yields the owner\'s figures before rounding up (round 7): 1,953,600 / 19,536,000 / 58,608,000 / 156,288,000; Family 8,613,000', () => {
        expect(TIERS.map((t) => agentNeed(DEFAULT_AGENT_ENTITLEMENT_LIMITS[t].aiAnalysesPerMonth as number))).toEqual([1_953_600, 19_536_000, 58_608_000, 156_288_000])
        expect(familyNeed(25)).toBe(8_613_000)
    })
})
