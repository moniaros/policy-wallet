import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveAgentPlanLimits, resolveB2cPlanLimits } from '@/lib/subscription-entitlements'
import { AgentEntitlementLimitsSchema, EntitlementLimitsSchema } from '@/lib/pricing/entitlement-schema'
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS, DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'

/**
 * Flag R (plan rows parse), owner round 6: `resolveB2cPlanLimits` / `resolveAgentPlanLimits`
 * (lib/subscription-entitlements.ts) use a plan row's `entitlements` JSON ONLY when it parses with the strict
 * canonical schema; otherwise they silently fall back to the code defaults. So "the production rows are what
 * the product enforces" holds only if the production values PARSE. This test takes every field of the
 * production rows committed for H-021 (tests/fixtures/production-plan-rows-2026-10-22.json), lays them over the
 * canonical shape and requires: the strict schema accepts it; the resolver returns the ROW's values (proved with
 * a sentinel no default carries), not the fallback; and an out-of-range value would fall back (probe).
 * Limits of the proof: (a) the fixture holds the fields the owner listed, not the raw `plans.entitlements` blob, so
 * fields absent from it (advancedAnalytics, analysisComparison, priorityQueue; collaborationThreads, questionnaireTemplates,
 * crossSellIntelligence, …) are taken from the code defaults, and an extra unknown key in the real blob (the schema is
 * strict) cannot be excluded from the repo; (b) every call passes `tierKey`, so name routing (normalizeTier(plan.name)) is
 * not exercised; (c) it proves the resolver, not resolveUserEntitlements' live-subscription query (a parsing Family
 * row still resolves to free if the subscription row is not live).
 */
const prod = JSON.parse(readFileSync('tests/fixtures/production-plan-rows-2026-10-22.json', 'utf-8'))
const SENTINEL = 123_456_789

describe('the production plan rows parse as canonical entitlements (flag R)', () => {
    for (const [tier, row] of Object.entries<any>(prod.policyholder)) {
        it(`policyholder ${tier}: strict schema accepts the row and the resolver uses it, not the fallback`, () => {
            const base: any = { ...DEFAULT_ENTITLEMENT_LIMITS[tier as 'free'] }
            const fields = ['policies', 'notifications', 'interactiveQA', 'questionsPerDay', 'portfolioGapView', 'gapAnalysisPerDay', 'agentCollaboration', 'savingsReportExport', 'aiAnalysisPerMonth', 'monthlyTokenBudget']
            for (const k of fields) base[k] = row[k]
            expect(EntitlementLimitsSchema.safeParse(base).success).toBe(true)
            // sentinel: a value no default carries must come back through the resolver
            const res = resolveB2cPlanLimits({ tierKey: tier, name: row.display, entitlements: { ...base, monthlyTokenBudget: SENTINEL } })
            expect(res.limits.monthlyTokenBudget, 'the row was parsed, not replaced by the code fallback').toBe(SENTINEL)
            expect(res.tier).toBe(tier)
            // and with the row's real values the resolver returns exactly them
            expect(resolveB2cPlanLimits({ tierKey: tier, name: row.display, entitlements: base }).limits).toMatchObject(Object.fromEntries(fields.map((k) => [k, row[k]])))
        })
    }

    for (const [tier, row] of Object.entries<any>(prod.agent)) {
        it(`agent ${tier}: strict schema accepts the row and the resolver uses it, not the fallback`, () => {
            const base: any = { ...DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier as 'agent_free'] }
            const fields = ['maxCustomers', 'aiAnalysesPerMonth', 'teamMembers', 'renewalAutomation', 'brandedReport', 'brandedPortal', 'maxPoliciesPerCustomer', 'monthlyTokenBudget']
            for (const k of fields) base[k] = row[k]
            expect(AgentEntitlementLimitsSchema.safeParse(base).success).toBe(true)
            const res = resolveAgentPlanLimits({ tierKey: tier, name: tier, entitlements: { ...base, monthlyTokenBudget: SENTINEL } })
            expect(res.limits.monthlyTokenBudget).toBe(SENTINEL)
            expect(resolveAgentPlanLimits({ tierKey: tier, name: tier, entitlements: base }).limits).toMatchObject(Object.fromEntries(fields.map((k) => [k, row[k]])))
        })
    }

    it('probe: a malformed row falls back to the code defaults (so a non-parsing production row would be silent)', () => {
        const bad = { ...DEFAULT_ENTITLEMENT_LIMITS.pro, monthlyTokenBudget: -1 }
        expect(EntitlementLimitsSchema.safeParse(bad).success).toBe(false)
        const res = resolveB2cPlanLimits({ tierKey: 'pro', name: 'Pro', entitlements: bad })
        expect(res.limits.monthlyTokenBudget).toBe(DEFAULT_ENTITLEMENT_LIMITS.pro.monthlyTokenBudget)
        // an unknown extra key also fails the strict schema — the one thing the repo cannot rule out for the raw blob
        expect(EntitlementLimitsSchema.safeParse({ ...DEFAULT_ENTITLEMENT_LIMITS.pro, extra: 1 }).success).toBe(false)
    })
})
