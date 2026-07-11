import { describe, it, expect, vi } from 'vitest'

// subscription-entitlements imports the db singleton — stub it out
vi.mock('@/lib/db', () => ({ db: {} }))

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
import { publicPricingContent } from '@/lib/pricing/public-pricing-content'

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

    it('tierUnlocks respects plan ranking', () => {
        const plusGate = FEATURE_GATES.full_ai_policy_analysis
        const proGate = FEATURE_GATES.export_report
        expect(tierUnlocks('free', plusGate)).toBe(false)
        expect(tierUnlocks('plus', plusGate)).toBe(true)
        expect(tierUnlocks('pro', plusGate)).toBe(true)
        expect(tierUnlocks('plus', proGate)).toBe(false)
        expect(tierUnlocks('pro', proGate)).toBe(true)
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
