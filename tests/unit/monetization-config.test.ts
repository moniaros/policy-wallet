import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// subscription-entitlements imports the db singleton — stub it out
vi.mock('@/lib/db', () => ({ db: {} }))
// lib/billing pulls in the Stripe client, which we never call here
vi.mock('@/lib/stripe', () => ({ stripe: {} }))

import {
    FEATURE_GATES,
    PLAN_PRICING,
    FREE_POLICY_LIMIT,
    PLUS_POLICY_LIMIT,
    PRO_POLICY_LIMIT,
    tierUnlocks,
    recommendedPlan,
} from '@/lib/monetization'
import { UPGRADE_COPY_EL } from '@/lib/monetization/upgrade-copy.el'
import { UPGRADE_COPY_EN } from '@/lib/monetization/upgrade-copy.en'
import { ENTITLEMENT_LIMITS } from '@/lib/subscription-entitlements'
import { DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
import { publicPricingContent } from '@/lib/pricing/public-pricing-content'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { ANNUAL_PRICE_BY_PLAN } from '@/lib/billing'

describe('monetization config parity (client snapshot vs server truth)', () => {
    it('policy limits match ENTITLEMENT_LIMITS', () => {
        expect(FREE_POLICY_LIMIT).toBe(ENTITLEMENT_LIMITS.free.policies)
        expect(PLUS_POLICY_LIMIT).toBe(ENTITLEMENT_LIMITS.plus.policies)
        expect(PRO_POLICY_LIMIT).toBe(ENTITLEMENT_LIMITS.pro.policies)
    })

    it('plan pricing matches the public pricing page amounts', () => {
        const allPlans = Object.values(publicPricingContent).flatMap((audience: any) =>
            Array.isArray(audience?.plans) ? audience.plans : []
        )
        for (const [tier, pricing] of Object.entries(PLAN_PRICING)) {
            const publicPlan = allPlans.find((p: any) => p.checkoutPlanId === pricing.planId)
            expect(publicPlan, `public pricing plan for ${tier}`).toBeTruthy()
            expect(publicPlan.pricing.monthly.amount).toBe(`€${pricing.monthlyEur}`)
            expect(publicPlan.pricing.annual?.amount).toBe(`€${pricing.annualEur}`)
        }
    })

    it('the in-app pricing tables quote PLAN_PRICING amounts', () => {
        for (const [tier, pricing] of Object.entries(PLAN_PRICING)) {
            const copyTier = (subscriptionCopy.tiers as any)[tier]
            expect(copyTier, `subscription copy for ${tier}`).toBeTruthy()
            for (const lang of ['el', 'en'] as const) {
                expect(copyTier.price[lang]).toBe(`€${pricing.monthlyEur}`)
                expect(copyTier.annual?.price[lang]).toBe(`€${pricing.annualEur}`)
            }
        }
    })

    // (The setup-billing-catalog.ts source-grep assertion was retired with the
    // admin-managed plan catalog: that script's Stripe prices were never read
    // by the live checkout, which builds inline price_data from the DB plan
    // row — see the deprecation header in scripts/setup-billing-catalog.ts.)

    it('checkout charges the advertised annual price (code fallback)', () => {
        for (const pricing of Object.values(PLAN_PRICING)) {
            expect(ANNUAL_PRICE_BY_PLAN[pricing.planId]).toBe(pricing.annualEur)
        }
    })

    it('every feature gate has copy in BOTH languages with all fields', () => {
        const gateKeys = Object.keys(FEATURE_GATES).sort()
        expect(Object.keys(UPGRADE_COPY_EL).sort()).toEqual(gateKeys)
        expect(Object.keys(UPGRADE_COPY_EN).sort()).toEqual(gateKeys)

        for (const key of gateKeys) {
            for (const copy of [UPGRADE_COPY_EL, UPGRADE_COPY_EN] as const) {
                const entry = (copy as any)[key]
                expect(entry.headline.length).toBeGreaterThan(0)
                expect(entry.body.length).toBeGreaterThan(0)
                expect(entry.primaryCta.length).toBeGreaterThan(0)
                expect(entry.benefits.length).toBeGreaterThanOrEqual(3)
                expect(entry.successMessage.length).toBeGreaterThan(0)
            }
        }
    })

    it('copy avoids forbidden urgency/fear phrases (Greek)', () => {
        const forbidden = [/μόνο για σήμερα/i, /κινδυνεύεις/i, /χάνεις χρήματα τώρα/i, /100% εγγυημένη/i]
        for (const entry of Object.values(UPGRADE_COPY_EL)) {
            const text = [entry.headline, entry.body, ...entry.benefits].join(' ')
            for (const pattern of forbidden) {
                expect(text).not.toMatch(pattern)
            }
        }
    })

    it('copy avoids forbidden urgency/fear phrases (English)', () => {
        const forbidden = [
            /today only/i,
            /last chance/i,
            /act now/i,
            /you('| a)re at risk/i,
            /losing money right now/i,
            /100% guaranteed/i,
        ]
        for (const entry of Object.values(UPGRADE_COPY_EN)) {
            const text = [entry.headline, entry.body, ...entry.benefits].join(' ')
            for (const pattern of forbidden) {
                expect(text).not.toMatch(pattern)
            }
        }
    })

    it('tierUnlocks respects plan ranking', () => {
        // Starter (code `plus`) unlocks the organizer gate; all deep-AI gates
        // require Plus (code `pro`).
        const plusGate = FEATURE_GATES.policy_upload_limit
        const proGate = FEATURE_GATES.full_ai_policy_analysis
        expect(tierUnlocks('free', plusGate)).toBe(false)
        expect(tierUnlocks('plus', plusGate)).toBe(true)
        expect(tierUnlocks('pro', plusGate)).toBe(true)
        expect(tierUnlocks('plus', proGate)).toBe(false)
        expect(tierUnlocks('pro', proGate)).toBe(true)
    })

    it('the capacity model holds (Free 3 / Plus 10 / Family 25, analyses unlimited)', () => {
        // Pricing v2: B2C sells CAPACITY. The policy count is the only
        // enforced consumer limit, and it is finite on every tier — an
        // "unlimited" tier would make the capacity ladder meaningless.
        expect(ENTITLEMENT_LIMITS.free.policies).toBe(3)
        expect(ENTITLEMENT_LIMITS.plus.policies).toBe(10)
        expect(ENTITLEMENT_LIMITS.pro.policies).toBe(25)

        // Analyses are unlimited on EVERY B2C tier, free included. Metering
        // them is what made the old model unexplainable, and a free tier that
        // will not read your policy demonstrates the product's weakest form.
        for (const tier of ['free', 'plus', 'pro'] as const) {
            expect(
                ENTITLEMENT_LIMITS[tier].aiAnalysisPerMonth,
                `${tier} must not meter analyses`
            ).toBeNull()
        }

        // The token budget is an internal abuse guard, so it must be a real
        // positive number on every tier — a zero budget is a hard block
        // wearing the word "unlimited".
        for (const tier of ['free', 'plus', 'pro'] as const) {
            expect(ENTITLEMENT_LIMITS[tier].monthlyTokenBudget, `${tier} budget`).toBeGreaterThan(0)
        }

        // ...and it must rise with the tier, or a paying customer funds less
        // work than a free one.
        expect(ENTITLEMENT_LIMITS.free.monthlyTokenBudget)
            .toBeLessThan(ENTITLEMENT_LIMITS.plus.monthlyTokenBudget!)
        expect(ENTITLEMENT_LIMITS.plus.monthlyTokenBudget!)
            .toBeLessThan(ENTITLEMENT_LIMITS.pro.monthlyTokenBudget!)

        expect(ENTITLEMENT_LIMITS.plus.notifications).toBe(true)
        expect(ENTITLEMENT_LIMITS.pro.interactiveQA).toBe(true)
        // Every deep-AI gate unlocks only at Plus (code `pro`)
        const aiGates = [
            'full_ai_policy_analysis',
            'advanced_gap_detection',
            'unlimited_ai_questions',
            'multi_insurer_insights',
            'duplicate_coverage_detection',
            'claims_preparation_assistant',
            // family_portfolio was removed — a Pro-gated promise with full sales
            // copy that nothing implemented and nothing could reach.
        ] as const
        for (const key of aiGates) {
            expect(FEATURE_GATES[key].requiredPlan, `${key} should require pro`).toBe('pro')
        }
        // Family is priced above Plus, and the annual price beats 12× monthly
        // on both — the model is annual-first, so an annual plan that costs
        // more than paying monthly would contradict the page selling it.
        expect(PLAN_PRICING.pro.monthlyEur).toBeGreaterThan(PLAN_PRICING.plus.monthlyEur)
        for (const tier of ['plus', 'pro'] as const) {
            const { monthlyEur, annualEur } = PLAN_PRICING[tier]
            expect(annualEur, `${tier} annual must undercut 12× monthly`)
                .toBeLessThan(monthlyEur * 12)
        }
    })

    // Source-grep guard (same technique as the retired setup-billing-catalog
    // assertion): the landing page once advertised "3 free policies + 1 AI
    // analysis" while the enforced free entitlement was 1 policy / 0 analyses.
    // Pin the landing copy to the catalog truth so the false claim can't return.
    it('landing free-tier copy matches the enforced free entitlement', () => {
        // The free-tier promise now lives in lib/marketing/positioning.ts (one
        // string reused by the hero, the final CTA, /product and /compare)
        // rather than inline in the landing component. Scanning only the
        // component would have left this guard passing over a file that no
        // longer contains the claim it is guarding, so both are read.
        const source = [
            'components/landing/WorldClassLanding.tsx',
            'lib/marketing/positioning.ts',
        ]
            .map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
            .join('\n')

        // This used to enumerate "3 policies" as a FALSE claim, because the
        // free tier was one. Pricing v2 made three the truth, and a guard that
        // hardcodes last quarter's number fails on the day the product is
        // right. So the check is derived: whatever the code enforces is the
        // only count the landing may advertise, and every OTHER small number
        // is forbidden — which catches drift in both directions.
        const freeLimit = DEFAULT_ENTITLEMENT_LIMITS.free.policies
        expect(freeLimit, 'the free tier must enforce a finite policy count').toBeTypeOf('number')

        expect(source, 'the landing must state the enforced free limit in Greek')
            .toMatch(new RegExp(`${freeLimit}\\s*ασφαλιστήρι`))
        expect(source, 'the landing must state the enforced free limit in English')
            .toMatch(new RegExp(`${freeLimit}\\s*polic`))

        for (const wrong of [1, 2, 3, 5, 10, 25].filter((n) => n !== freeLimit)) {
            expect(source, `landing advertises ${wrong} policies but the code enforces ${freeLimit}`)
                .not.toMatch(new RegExp(`\\b${wrong}\\s*(ασφαλιστήρι|polic)`))
        }

        // Analyses are unlimited on free now, so the landing must not meter them.
        expect(DEFAULT_ENTITLEMENT_LIMITS.free.aiAnalysisPerMonth).toBeNull()
        expect(source).not.toMatch(/\d+ AI ανάλυσ|\d+ AI analys/i)
    })

    it('recommendedPlan escalates sensibly', () => {
        const plusGate = FEATURE_GATES.policy_upload_limit
        const proGate = FEATURE_GATES.export_report
        expect(recommendedPlan('free', plusGate)).toBe('plus')
        expect(recommendedPlan('plus', plusGate)).toBe('pro') // already at plus → next tier
        expect(recommendedPlan('free', proGate)).toBe('pro')
        expect(recommendedPlan('plus', proGate)).toBe('pro')
    })
})
