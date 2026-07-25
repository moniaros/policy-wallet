import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { subscriptionCopy } from '@/lib/subscription-copy'

/**
 * The pricing comparison highlights one tier as "Popular" and gives it the
 * emphasis ribbon + styling. That highlight must land on the tier that actually
 * carries the "Popular"/"Best value" badge — PolicyWallet Plus (code key `pro`),
 * the flagship AI tier every other surface recommends.
 *
 * It used to sit on Starter (code key `plus`), which has NO badge, so the ribbon
 * fell back to the generic word "Upgrade" and the cheaper organizer tier was
 * pushed as the recommendation — contradicting the copy on the same object.
 */
describe('the highlighted pricing tier is the one with the Popular badge', () => {
    it('the "Popular" badge belongs to pro (PolicyWallet Plus), not plus (Starter)', () => {
        expect(subscriptionCopy.tiers.pro.badge, 'pro must carry the Popular badge').toBeTruthy()
        expect(
            (subscriptionCopy.tiers.plus as { badge?: unknown }).badge,
            'the Starter tier must NOT carry a Popular badge',
        ).toBeFalsy()
    })

    it('PricingComparison flags ph-pro popular, never ph-plus', () => {
        const src = readFileSync('components/account/PricingComparison.tsx', 'utf-8')
        const plusIdx = src.indexOf("id: 'ph-plus'")
        const proIdx = src.indexOf("id: 'ph-pro'")
        expect(plusIdx).toBeGreaterThan(-1)
        expect(proIdx).toBeGreaterThan(plusIdx)

        const plusBlock = src.slice(plusIdx, proIdx) // the ph-plus tier object
        const proBlock = src.slice(proIdx) // ph-pro onward (nothing later sets popular)

        expect(/popular:\s*true/.test(plusBlock), 'ph-plus (Starter) must not be flagged popular').toBe(false)
        expect(/popular:\s*true/.test(proBlock), 'ph-pro (PolicyWallet Plus) must be flagged popular').toBe(true)
    })

    it('the emphasis ribbon therefore renders a real badge, not the "Upgrade" fallback', () => {
        // The ribbon reads tier.badge ?? copy.cta.upgrade. Since the popular tier
        // (pro) carries a badge, the fallback is never reached — assert the two are
        // distinct so a regression that drops the badge would surface as "Upgrade".
        expect(subscriptionCopy.tiers.pro.badge?.en).not.toBe(subscriptionCopy.cta.upgrade.en)
        expect(subscriptionCopy.tiers.pro.badge?.en?.toLowerCase()).toContain('popular')
    })
})
