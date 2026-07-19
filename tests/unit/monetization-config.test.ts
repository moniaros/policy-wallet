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
        expect(ENTITLEMENT_LIMITS.pro.policies).toBeNull()
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

    it('the paid-aha-loop tier model holds (Free 1 / Starter 5, no AI / Plus all AI)', () => {
        // Policy caps
        expect(ENTITLEMENT_LIMITS.free.policies).toBe(1)
        expect(ENTITLEMENT_LIMITS.plus.policies).toBe(5)
        expect(ENTITLEMENT_LIMITS.pro.policies).toBeNull()
        // Starter (code `plus`) has ZERO deep AI — it must not cannibalize Plus
        expect(ENTITLEMENT_LIMITS.plus.interactiveQA).toBe(false)
        expect(ENTITLEMENT_LIMITS.plus.aiAnalysisPerMonth).toBe(0)
        expect(ENTITLEMENT_LIMITS.plus.questionsPerDay).toBe(0)
        expect(ENTITLEMENT_LIMITS.plus.gapAnalysisPerDay).toBe(0)
        expect(ENTITLEMENT_LIMITS.plus.portfolioGapView).toBe(false)
        // Starter keeps basic renewal reminders
        expect(ENTITLEMENT_LIMITS.plus.notifications).toBe(true)
        // Plus (code `pro`) is the AI tier
        expect(ENTITLEMENT_LIMITS.pro.interactiveQA).toBe(true)
        // Every deep-AI gate unlocks only at Plus (code `pro`)
        const aiGates = [
            'full_ai_policy_analysis',
            'advanced_gap_detection',
            'unlimited_ai_questions',
            'multi_insurer_insights',
            'duplicate_coverage_detection',
            'claims_preparation_assistant',
            'family_portfolio',
        ] as const
        for (const key of aiGates) {
            expect(FEATURE_GATES[key].requiredPlan, `${key} should require pro`).toBe('pro')
        }
        // Plus (€7.99) is priced above Starter (€2.99)
        expect(PLAN_PRICING.pro.monthlyEur).toBe(7.99)
        expect(PLAN_PRICING.plus.monthlyEur).toBe(2.99)
    })

    // Source-grep guard (same technique as the retired setup-billing-catalog
    // assertion): the landing page once advertised "3 free policies + 1 AI
    // analysis" while the enforced free entitlement was 1 policy / 0 analyses.
    // Pin the landing copy to the catalog truth so the false claim can't return.
    it('landing free-tier copy matches the enforced free entitlement', () => {
        const source = readFileSync(
            join(process.cwd(), 'components/landing/WorldClassLanding.tsx'),
            'utf8'
        )

        // The retired false claims, in either language and either word order.
        const falseClaims = [
            '3 συμβόλαια',
            '3 δωρεάν',
            'δωρεάν έως 3',
            '3 policies',
            '3 free',
            '3+1',
        ]
        for (const claim of falseClaims) {
            expect(source, `landing must not claim "${claim}"`).not.toContain(claim)
        }

        // The advertised limit is the one the product actually enforces.
        const freeLimit = DEFAULT_ENTITLEMENT_LIMITS.free.policies
        expect(freeLimit, 'free tier stores exactly 1 policy').toBe(1)
        expect(source).toContain(`${freeLimit} συμβόλαιο`)
        expect(source).toContain(`${freeLimit} policy`)
        // Free has zero deep-AI analyses, so the landing may not sell one.
        expect(DEFAULT_ENTITLEMENT_LIMITS.free.aiAnalysisPerMonth).toBe(0)
        expect(source).not.toMatch(/1 AI ανάλυση|1 AI analysis/i)
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
