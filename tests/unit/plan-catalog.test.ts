import { describe, it, expect, vi, beforeEach } from 'vitest'

// unstable_cache needs a Next server runtime — pass the loader through.
vi.mock('next/cache', () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}))

const findMany = vi.fn()
vi.mock('@/lib/db', () => ({ db: { plan: { findMany: (...args: unknown[]) => findMany(...args) }, subscription: {} } }))

import {
    buildSyntheticCatalog,
    getCanonicalPlanForTier,
    getPlanById,
    getVisiblePlans,
    loadPlanCatalogUncached,
    resolveTierKey,
} from '@/lib/pricing/plan-catalog'
import {
    DEFAULT_AGENT_ENTITLEMENT_LIMITS,
    DEFAULT_ANNUAL_PRICE_BY_PLAN,
    DEFAULT_ENTITLEMENT_LIMITS,
    DEFAULT_PLAN_FACTS,
    DEFAULT_TOKEN_LIMITS,
    DEFAULT_TRIAL_DAYS_BY_PLAN,
} from '@/lib/pricing/plan-defaults'
import {
    AgentEntitlementLimitsSchema,
    EntitlementLimitsSchema,
} from '@/lib/pricing/entitlement-schema'
import { PLAN_SEED } from '../../prisma/plan-seed-data'
import { PLAN_PRICING } from '@/lib/monetization/feature-gates'
import { AGENT_PRICING } from '@/lib/subscription-entitlements'

/** A DB row in the post-migration canonical shape. */
function dbRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'ph-pro',
        planType: 'policyholder',
        name: 'Pro',
        displayName: 'PolicyWallet Plus',
        price: 7.99,
        entitlements: { ...DEFAULT_ENTITLEMENT_LIMITS.pro },
        tierKey: 'pro',
        annualPrice: 79,
        trialDays: 14,
        isActive: true,
        isPublic: true,
        sortOrder: 2,
        version: 1,
        ...overrides,
    }
}

beforeEach(() => {
    findMany.mockReset()
})

describe('entitlement schema ↔ defaults round-trip', () => {
    it('every B2C default parses under the strict schema', () => {
        for (const [tier, limits] of Object.entries(DEFAULT_ENTITLEMENT_LIMITS)) {
            const parsed = EntitlementLimitsSchema.safeParse(limits)
            expect(parsed.success, `B2C ${tier}`).toBe(true)
        }
    })

    it('every agent default parses under the strict schema', () => {
        for (const [tier, limits] of Object.entries(DEFAULT_AGENT_ENTITLEMENT_LIMITS)) {
            const parsed = AgentEntitlementLimitsSchema.safeParse(limits)
            expect(parsed.success, `agent ${tier}`).toBe(true)
        }
    })

    it('the legacy informational seed shape is rejected (fails closed to defaults)', () => {
        const legacy = { policy_storage: 5, ai_analyses_per_month: 0, notifications: 'basic' }
        expect(EntitlementLimitsSchema.safeParse(legacy).success).toBe(false)
        expect(AgentEntitlementLimitsSchema.safeParse({ customer_limit: 10 }).success).toBe(false)
    })

    it('unknown keys are rejected — a half-canonical row must not half-apply', () => {
        const withExtra = { ...DEFAULT_ENTITLEMENT_LIMITS.pro, surprise: true }
        expect(EntitlementLimitsSchema.safeParse(withExtra).success).toBe(false)
    })
})

describe('fallback consistency (seed ↔ defaults ↔ client snapshots)', () => {
    it('PLAN_SEED derives exactly from DEFAULT_PLAN_FACTS', () => {
        expect(PLAN_SEED.map((p) => p.id)).toEqual(DEFAULT_PLAN_FACTS.map((f) => f.id))
        for (const seed of PLAN_SEED) {
            const facts = DEFAULT_PLAN_FACTS.find((f) => f.id === seed.id)!
            expect(seed.price).toBe(facts.monthlyEur)
            expect(seed.annualPrice).toBe(facts.annualEur)
            expect(seed.trialDays).toBe(facts.trialDays)
            expect(seed.tierKey).toBe(facts.tierKey)
        }
    })

    it('DEFAULT_PLAN_FACTS matches the client PLAN_PRICING snapshot', () => {
        for (const [tier, pricing] of Object.entries(PLAN_PRICING)) {
            const facts = DEFAULT_PLAN_FACTS.find((f) => f.id === pricing.planId)
            expect(facts, `facts for ${tier}`).toBeTruthy()
            expect(facts!.monthlyEur).toBe(pricing.monthlyEur)
            expect(facts!.annualEur).toBe(pricing.annualEur)
            expect(facts!.trialDays).toBe(pricing.trialDays ?? 0)
        }
    })

    it('DEFAULT_PLAN_FACTS matches AGENT_PRICING monthlies', () => {
        for (const facts of DEFAULT_PLAN_FACTS.filter((f) => f.planType === 'agent')) {
            expect(facts.monthlyEur).toBe(AGENT_PRICING[facts.tierKey as keyof typeof AGENT_PRICING].monthlyEur)
        }
    })

    it('annual/trial fact tables agree with the per-plan maps', () => {
        for (const facts of DEFAULT_PLAN_FACTS) {
            expect(facts.annualEur ?? undefined).toBe(DEFAULT_ANNUAL_PRICE_BY_PLAN[facts.id])
            expect(facts.trialDays).toBe(DEFAULT_TRIAL_DAYS_BY_PLAN[facts.id] ?? 0)
        }
    })

    it('B2C token budgets in the entitlement defaults match DEFAULT_TOKEN_LIMITS', () => {
        for (const tier of ['free', 'plus', 'pro'] as const) {
            expect(DEFAULT_ENTITLEMENT_LIMITS[tier].monthlyTokenBudget).toBe(
                DEFAULT_TOKEN_LIMITS[tier]
            )
        }
    })
})

describe('tier-key resolution', () => {
    it('explicit tier_key wins for its own audience', () => {
        expect(resolveTierKey('policyholder', 'plus', 'Whatever')).toBe('plus')
        expect(resolveTierKey('agent', 'agency', 'whatever')).toBe('agency')
    })

    it('null/unknown/cross-audience keys fall back to name routing', () => {
        expect(resolveTierKey('policyholder', null, 'Pro')).toBe('pro')
        expect(resolveTierKey('policyholder', 'not-a-tier', 'Plus')).toBe('plus')
        // a B2C row wrongly stamped with an agent key routes by name
        expect(resolveTierKey('policyholder', 'agent_pro', 'Premium Plan')).toBe('pro')
        expect(resolveTierKey('agent', 'pro', 'agent_starter')).toBe('agent_starter')
    })
})

describe('catalog loading', () => {
    it('maps canonical DB rows into serializable DTOs (Decimal-free)', async () => {
        findMany.mockResolvedValue([dbRow()])
        const catalog = await loadPlanCatalogUncached()
        expect(catalog).toHaveLength(1)
        const plan = catalog[0]
        expect(plan.monthlyEur).toBe(7.99)
        expect(plan.effectiveAnnualEur).toBe(79)
        expect(plan.trialDays).toBe(14)
        expect(plan.entitlements).toEqual(DEFAULT_ENTITLEMENT_LIMITS.pro)
    })

    it('a row with legacy entitlements resolves to code defaults for its tier', async () => {
        findMany.mockResolvedValue([
            dbRow({ entitlements: { policy_storage: 'unlimited', ai_analyses_per_month: 50 } }),
        ])
        const catalog = await loadPlanCatalogUncached()
        expect(catalog[0].entitlements).toEqual(DEFAULT_ENTITLEMENT_LIMITS.pro)
    })

    it('an admin-edited valid entitlements row is used as-is', async () => {
        const edited = { ...DEFAULT_ENTITLEMENT_LIMITS.pro, policies: 42 }
        findMany.mockResolvedValue([dbRow({ entitlements: edited })])
        const catalog = await loadPlanCatalogUncached()
        expect((catalog[0].entitlements as { policies: number | null }).policies).toBe(42)
    })

    it('annualPrice null falls back to the code map, then 12× monthly', async () => {
        findMany.mockResolvedValue([
            dbRow({ annualPrice: null }),
            dbRow({ id: 'ph-custom', tierKey: null, name: 'Pro', annualPrice: null, price: 5 }),
        ])
        const catalog = await loadPlanCatalogUncached()
        expect(catalog[0].effectiveAnnualEur).toBe(DEFAULT_ANNUAL_PRICE_BY_PLAN['ph-pro'])
        expect(catalog[1].effectiveAnnualEur).toBe(60)
    })

    it('DB failure serves the synthetic catalog (never throws)', async () => {
        findMany.mockRejectedValue(new Error('connection refused'))
        const catalog = await loadPlanCatalogUncached()
        expect(catalog.map((p) => p.id).sort()).toEqual(
            [...DEFAULT_PLAN_FACTS.map((f) => f.id)].sort()
        )
    })

    it('an empty plans table serves the synthetic catalog', async () => {
        findMany.mockResolvedValue([])
        const catalog = await loadPlanCatalogUncached()
        expect(catalog.length).toBe(DEFAULT_PLAN_FACTS.length)
    })
})

describe('catalog selectors', () => {
    it('canonical plan for a tier prefers the seeded id over a legacy row sharing the tier', async () => {
        findMany.mockResolvedValue([
            dbRow({ id: 'ph-premium', name: 'Premium', tierKey: 'pro', sortOrder: 0, isPublic: false, isActive: false }),
            dbRow(),
        ])
        const plan = await getCanonicalPlanForTier('pro')
        expect(plan?.id).toBe('ph-pro')
    })

    it('falls back to the lowest-sortOrder carrier when the seeded row is gone', async () => {
        findMany.mockResolvedValue([
            dbRow({ id: 'ph-premium', name: 'Premium', tierKey: 'pro', sortOrder: 5 }),
        ])
        const plan = await getCanonicalPlanForTier('pro')
        expect(plan?.id).toBe('ph-premium')
    })

    it('getVisiblePlans filters on isPublic AND isActive, ordered by sortOrder', async () => {
        findMany.mockResolvedValue([
            dbRow({ id: 'b', sortOrder: 2 }),
            dbRow({ id: 'hidden', isPublic: false }),
            dbRow({ id: 'retired', isActive: false }),
            dbRow({ id: 'a', sortOrder: 1 }),
        ])
        const visible = await getVisiblePlans('policyholder')
        expect(visible.map((p) => p.id)).toEqual(['a', 'b'])
    })

    it('getPlanById finds by id', async () => {
        findMany.mockResolvedValue([dbRow()])
        expect((await getPlanById('ph-pro'))?.id).toBe('ph-pro')
        expect(await getPlanById('nope')).toBeNull()
    })

    it('buildSyntheticCatalog is fully purchasable and public', () => {
        for (const plan of buildSyntheticCatalog()) {
            expect(plan.isActive).toBe(true)
            expect(plan.isPublic).toBe(true)
            expect(plan.entitlements).toBeTruthy()
        }
    })
})
