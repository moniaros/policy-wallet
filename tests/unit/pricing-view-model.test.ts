import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))
vi.mock('@/lib/db', () => ({ db: {} }))

import { buildSyntheticCatalog, type CatalogPlan } from '@/lib/pricing/plan-catalog'
import { buildPublicPricingContent, formatEur } from '@/lib/pricing/pricing-view-model'
import { publicPricingContent } from '@/lib/pricing/public-pricing-content'

function synthetic(): CatalogPlan[] {
    return buildSyntheticCatalog()
}

describe('formatEur', () => {
    it('renders integers bare and decimals with two places', () => {
        expect(formatEur(29)).toBe('€29')
        expect(formatEur(7.99)).toBe('€7.99')
        expect(formatEur(0)).toBe('€0')
    })
})

describe('buildPublicPricingContent', () => {
    it('over the default catalog it reproduces the template EXACTLY (zero copy drift)', () => {
        const built = buildPublicPricingContent(synthetic())
        expect(built).toEqual(publicPricingContent)
    })

    it('an admin price edit reaches the card amounts', () => {
        const catalog = synthetic().map((p) =>
            p.id === 'ph-pro' ? { ...p, monthlyEur: 8.99, effectiveAnnualEur: 89 } : p
        )
        const built = buildPublicPricingContent(catalog)
        const pro = built.policyholder.plans.find((p) => p.checkoutPlanId === 'ph-pro')!
        expect(pro.pricing.monthly.amount).toBe('€8.99')
        expect(pro.pricing.annual?.amount).toBe('€89')
    })

    it('a changed price replaces the hand-written savings prose with computed savings', () => {
        const catalog = synthetic().map((p) =>
            p.id === 'ph-pro' ? { ...p, monthlyEur: 8.99, effectiveAnnualEur: 89 } : p
        )
        const built = buildPublicPricingContent(catalog)
        const pro = built.policyholder.plans.find((p) => p.checkoutPlanId === 'ph-pro')!
        // 8.99×12 − 89 = 18.88 → ~€19
        expect(pro.pricing.annual?.savings.en).toBe('Save ~€19')
        expect(pro.pricing.annual?.savings.el).toContain('~€19')
    })

    it('unchanged prices keep the template savings prose verbatim', () => {
        const built = buildPublicPricingContent(synthetic())
        const pro = built.policyholder.plans.find((p) => p.checkoutPlanId === 'ph-pro')!
        expect(pro.pricing.annual?.savings).toEqual(
            publicPricingContent.policyholder.plans.find((p) => p.checkoutPlanId === 'ph-pro')!
                .pricing.annual?.savings
        )
    })

    it('isPublic=false drops the plan card', () => {
        const catalog = synthetic().map((p) =>
            p.id === 'ph-plus' ? { ...p, isPublic: false } : p
        )
        const built = buildPublicPricingContent(catalog)
        expect(built.policyholder.plans.map((p) => p.key)).toEqual(['free', 'pro'])
        // other audience untouched
        expect(built.agent.plans).toHaveLength(publicPricingContent.agent.plans.length)
    })

    it('a plan missing from the catalog renders its template card unchanged', () => {
        const catalog = synthetic().filter((p) => p.id !== 'agent-agency')
        const built = buildPublicPricingContent(catalog)
        const agency = built.agent.plans.find((p) => p.key === 'agent-agency')!
        expect(agency.pricing.monthly.amount).toBe('€199')
    })
})
