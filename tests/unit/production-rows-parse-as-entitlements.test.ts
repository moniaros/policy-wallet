import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveAgentPlanLimits, resolveB2cPlanLimits } from '@/lib/subscription-entitlements'
import { AgentEntitlementLimitsSchema, EntitlementLimitsSchema } from '@/lib/pricing/entitlement-schema'
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS, DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'

/**
 * Flag R (plan rows parse), owner rounds 6–7: `resolveB2cPlanLimits` / `resolveAgentPlanLimits`
 * (lib/subscription-entitlements.ts) use a plan row's `entitlements` JSON ONLY when it parses with the strict
 * canonical schema; otherwise they silently fall back to the code defaults. So "the production rows are what
 * the product enforces" holds only if the production values PARSE.
 * Round 7: the fixture now carries the RAW `plans.entitlements` blobs, verbatim as the owner read them on 2026-10-22
 * (before the budget edits; `rawEntitlementsText` is the exact text, `rawEntitlements` its parse). Each blob is parsed
 * through the strict schema UNMODIFIED and through the real resolver, which must return the blob's values (proved
 * with a sentinel no default carries), not the fallback. A blob that fails reports its key; the schema is never loosened.
 * Only monthlyTokenBudget is superseded (round-7 budgets, in the `policyholder`/`agent` rows); every other key is current.
 * Limits of the proof: (a) a blob is parsed as the owner transcribed it, not read from the database by this test;
 * (b) every call passes `tierKey`, so name routing (normalizeTier(plan.name)) is not exercised; (c) it proves the
 * resolver, not resolveUserEntitlements' live-subscription query (a parsing Family row still resolves to free if the
 * subscription row is not live); (d) the budgets saved in production after 2026-10-22 are the owner's, not checked here.
 */
const prod = JSON.parse(readFileSync('tests/fixtures/production-plan-rows-2026-10-22.json', 'utf-8'))
const SENTINEL = 123_456_789
const B2C: Record<string, string> = { 'ph-free': 'free', 'ph-plus': 'plus', 'ph-pro': 'pro' }
const AGENT: Record<string, string> = { 'agent-free': 'agent_free', 'agent-starter': 'agent_starter', 'agent-pro': 'agent_pro', agency: 'agency' }

describe('the raw production plan blobs parse as canonical entitlements (flag R)', () => {
    it('the fixture holds exactly the seven blobs, and the verbatim text equals its parse', () => {
        expect(Object.keys(prod.rawEntitlements).sort()).toEqual([...Object.keys(B2C), ...Object.keys(AGENT)].sort())
        for (const [k, text] of Object.entries<string>(prod.rawEntitlementsText)) expect(JSON.parse(text), k).toEqual(prod.rawEntitlements[k])
    })

    for (const [key, tier] of Object.entries(B2C)) {
        it(`${key}: the verbatim blob passes the strict schema; the resolver returns the blob, not the fallback`, () => {
            const raw = JSON.parse(prod.rawEntitlementsText[key])
            const parsed = EntitlementLimitsSchema.safeParse(raw)
            expect(parsed.success, `${key}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true)
            const res = resolveB2cPlanLimits({ tierKey: tier, name: prod.policyholder[tier].display, entitlements: { ...raw, monthlyTokenBudget: SENTINEL } })
            expect(res.limits.monthlyTokenBudget, 'the blob was parsed, not replaced by the code fallback').toBe(SENTINEL)
            expect(res.tier).toBe(tier)
            expect(resolveB2cPlanLimits({ tierKey: tier, name: prod.policyholder[tier].display, entitlements: raw }).limits).toMatchObject(raw)
        })
        it(`${key}: the fixture row agrees with the blob on every shared key except the superseded budget`, () => {
            const raw = prod.rawEntitlements[key], row = prod.policyholder[tier]
            for (const k of Object.keys(raw).filter((k) => k !== 'monthlyTokenBudget' && k in row)) expect(row[k], `${key}.${k}`).toEqual(raw[k])
        })
    }

    for (const [key, tier] of Object.entries(AGENT)) {
        it(`${key}: the verbatim blob passes the strict schema; the resolver returns the blob, not the fallback`, () => {
            const raw = JSON.parse(prod.rawEntitlementsText[key])
            const parsed = AgentEntitlementLimitsSchema.safeParse(raw)
            expect(parsed.success, `${key}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true)
            const res = resolveAgentPlanLimits({ tierKey: tier, name: tier, entitlements: { ...raw, monthlyTokenBudget: SENTINEL } })
            expect(res.limits.monthlyTokenBudget).toBe(SENTINEL)
            expect(resolveAgentPlanLimits({ tierKey: tier, name: tier, entitlements: raw }).limits).toMatchObject(raw)
        })
        it(`${key}: the fixture row agrees with the blob on every shared key except the superseded budget`, () => {
            const raw = prod.rawEntitlements[key], row = prod.agent[tier]
            for (const k of Object.keys(raw).filter((k) => k !== 'monthlyTokenBudget' && k in row)) expect(row[k], `${key}.${k}`).toEqual(raw[k])
        })
    }

    it('the blob with the round-7 budget laid over it still parses (what the owner saves in /admin/plans)', () => {
        for (const [key, tier] of Object.entries(B2C)) expect(EntitlementLimitsSchema.safeParse({ ...prod.rawEntitlements[key], monthlyTokenBudget: prod.policyholder[tier].monthlyTokenBudget }).success, key).toBe(true)
        for (const [key, tier] of Object.entries(AGENT)) expect(AgentEntitlementLimitsSchema.safeParse({ ...prod.rawEntitlements[key], monthlyTokenBudget: prod.agent[tier].monthlyTokenBudget }).success, key).toBe(true)
    })

    it('the code defaults equal the blobs on every key except the superseded budget', () => {
        for (const [key, tier] of Object.entries(B2C)) {
            const { monthlyTokenBudget: _b, ...rest } = prod.rawEntitlements[key]
            expect(DEFAULT_ENTITLEMENT_LIMITS[tier as 'free'], key).toMatchObject(rest)
        }
        for (const [key, tier] of Object.entries(AGENT)) {
            const { monthlyTokenBudget: _b, ...rest } = prod.rawEntitlements[key]
            expect(DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier as 'agent_free'], key).toMatchObject(rest)
        }
    })

    it('probe: a malformed blob falls back to the code defaults (so a non-parsing production row would be silent)', () => {
        const bad = { ...DEFAULT_ENTITLEMENT_LIMITS.pro, monthlyTokenBudget: -1 }
        expect(EntitlementLimitsSchema.safeParse(bad).success).toBe(false)
        const res = resolveB2cPlanLimits({ tierKey: 'pro', name: 'Pro', entitlements: bad })
        expect(res.limits.monthlyTokenBudget).toBe(DEFAULT_ENTITLEMENT_LIMITS.pro.monthlyTokenBudget)
        // an unknown extra key also fails the strict schema: a blob with one is the failure this test would name
        expect(EntitlementLimitsSchema.safeParse({ ...prod.rawEntitlements['ph-pro'], extra: 1 }).success).toBe(false)
        expect(AgentEntitlementLimitsSchema.safeParse({ ...prod.rawEntitlements.agency, extra: 1 }).success).toBe(false)
    })
})
