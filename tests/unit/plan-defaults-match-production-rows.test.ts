import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS, DEFAULT_ENTITLEMENT_LIMITS, DEFAULT_PLAN_FACTS } from '@/lib/pricing/plan-defaults'
import { planClaim } from '@/lib/marketing/plan-claims'
import type { AgentTier, PlanTier } from '@/types/subscription-entitlements'

/**
 * H-021 (closed 2026-10-22): the entitlement-claim guard derives every public claim from the code
 * defaults in plan-defaults.ts. That is only evidence about PRODUCTION if the defaults equal the
 * production rows. This test compares them field by field with the rows the owner read from
 * production (tests/fixtures/production-plan-rows-2026-10-22.json). When production changes, update
 * the fixture; a mismatch means the public copy is being checked against numbers nobody charges.
 */
const prod = JSON.parse(readFileSync('tests/fixtures/production-plan-rows-2026-10-22.json', 'utf-8'))

describe('code defaults equal the production plan rows (H-021)', () => {
    for (const [tier, row] of Object.entries<any>(prod.policyholder)) {
        it(`policyholder ${tier}: entitlements, price, annual price, trial`, () => {
            const limits: any = DEFAULT_ENTITLEMENT_LIMITS[tier as PlanTier]
            for (const key of ['policies', 'notifications', 'interactiveQA', 'questionsPerDay', 'portfolioGapView', 'gapAnalysisPerDay', 'agentCollaboration', 'savingsReportExport', 'aiAnalysisPerMonth', 'monthlyTokenBudget']) {
                expect(limits[key], `${tier}.${key}`).toEqual(row[key])
            }
            const fact = DEFAULT_PLAN_FACTS.find((p) => p.tierKey === tier)!
            expect(fact.monthlyEur, `${tier} monthly`).toBe(row.monthlyEur)
            expect(fact.annualEur, `${tier} annual`).toBe(row.annualEur)
            expect(fact.trialDays, `${tier} trial`).toBe(row.trialDays)
            expect(fact.displayName).toBe(row.display)
        })
    }

    for (const [tier, row] of Object.entries<any>(prod.agent)) {
        it(`agent ${tier}: entitlements, price, annual price`, () => {
            const limits: any = DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier as AgentTier]
            for (const key of ['maxCustomers', 'aiAnalysesPerMonth', 'teamMembers', 'renewalAutomation', 'brandedReport', 'brandedPortal', 'maxPoliciesPerCustomer']) {
                expect(limits[key], `${tier}.${key}`).toEqual(row[key])
            }
            const fact = DEFAULT_PLAN_FACTS.find((p) => p.tierKey === tier)!
            expect(fact.monthlyEur).toBe(row.monthlyEur)
            expect(fact.annualEur).toBe(row.annualEur)
        })
    }

    it('the published agent analysis counts are 5 / 50 / 150 / 400 (owner decision, H-027)', () => {
        expect(['agent_free', 'agent_starter', 'agent_pro', 'agency'].map((t) => planClaim('agent.analysesPerMonth', t as AgentTier)))
            .toEqual([5, 50, 150, 400])
    })

    it('no policyholder plan has a monthly analysis count to publish (H-020)', () => {
        for (const row of Object.values<any>(prod.policyholder)) expect(row.aiAnalysisPerMonth).toBeNull()
    })
})
