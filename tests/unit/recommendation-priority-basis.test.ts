import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { prioritizeRecommendations } from '@/lib/services/gap-engine/recommendation-generator'
import { lobProtectionWeight } from '@/lib/services/gap-engine/protection-score'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))

const rec = (lineOfBusiness: string, urgency: any, estimatedCostEur: number | null) => ({
    userId: 'u1',
    lineOfBusiness,
    ruleId: `rule:${lineOfBusiness}`,
    gapInstanceId: null,
    title: { en: lineOfBusiness, el: lineOfBusiness },
    description: { en: '', el: '' },
    urgency,
    estimatedCostEur,
    personalReason: { en: '', el: '' },
})

/**
 * Within a severity band the tiebreak was `estimatedCostEur` descending, under
 * the comment "higher estimated cost = higher priority (bigger gap)".
 *
 * Premium is not exposure, and often runs the other way: liability cover is
 * cheap precisely because claims are rare, and the loss it stands between you
 * and is the kind that ends a household. Because the price table is static,
 * ranking by it pushed liability below health for every user, every time — the
 * product's advice order was a fixed price list wearing a risk label.
 */
describe('recommendations are ordered by what is at stake, not by price', () => {
    it('does not put the pricier cover first when the cheaper one matters more', () => {
        // liability €200 vs travel €80 — price says liability, and so does the
        // protection model. Now check a case where they DISAGREE:
        // health (€800, weight 25) vs life (€600, weight 25) tie on weight, and
        // the old sort would have used price. Property (€250, weight 20) must
        // still beat travel (€80, weight 5) — and pet (€150) must not beat it.
        const sorted = prioritizeRecommendations([
            rec('travel', 'high', 80),
            rec('pet', 'high', 150),
            rec('home', 'high', 250),
            rec('liability', 'high', 200),
        ] as any)
        expect(sorted.map((r) => r.lineOfBusiness)).toEqual(['home', 'liability', 'pet', 'travel'])
    })

    it('liability outranks the cheaper "other" lines despite a lower premium than health', () => {
        expect(lobProtectionWeight('liability')).toBeGreaterThan(lobProtectionWeight('travel'))
        expect(lobProtectionWeight('liability')).toBeGreaterThan(lobProtectionWeight('pet'))
    })

    it('severity wins nothing (B1): the protection weight orders, whatever the urgency says', () => {
        const sorted = prioritizeRecommendations([
            rec('health', 'low', 800),
            rec('travel', 'critical', 80),
        ] as any)
        expect(sorted[0].lineOfBusiness).toBe('health')
    })

    it('is stable when weight and severity tie', () => {
        const a = prioritizeRecommendations([rec('health', 'high', 100), rec('life', 'high', 900)] as any)
        const b = prioritizeRecommendations([rec('life', 'high', 900), rec('health', 'high', 100)] as any)
        expect(a.map((r) => r.ruleId)).toEqual(b.map((r) => r.ruleId))
    })

    it('neither sort reaches for the price any more', () => {
        const src = read('lib/services/gap-engine/recommendation-generator.ts')
        expect(src).not.toMatch(/estimatedCostEur \?\? 0\) - \(?a?\.?estimatedCostEur/)
        expect(src).not.toMatch(/Number\(b\.estimatedCostEur/)
        // ONE comparator, used by both read paths — it holds the weight; the sort
        // sites hold nothing of their own, so neither can drift back to price.
        expect((src.match(/\.sort\(recommendationOrder\(/g) || []).length).toBeGreaterThanOrEqual(2)
        expect((src.match(/lobProtectionWeight\(/g) || []).length).toBeGreaterThanOrEqual(2)
    })
})

/**
 * `ESTIMATED_ANNUAL_PREMIUMS` is eleven flat numbers with no source and no
 * date, ignoring age for health and life, vehicle and driver history for motor,
 * sum insured and construction for home — every factor that actually prices a
 * policy. Rendered to a consumer as "Ενδεικτικό κόστος στην αγορά" / "Typical
 * market cost", that is a quantified claim about the Greek market.
 */
describe('the premium figure claims only what it can support', () => {
    const CARD = read('components/coverage/RecommendationCards.tsx')

    it('no longer calls itself the typical market cost', () => {
        expect(CARD).not.toMatch(/Typical market cost/)
        expect(CARD).not.toMatch(/Ενδεικτικό κόστος στην αγορά/)
    })

    it('presents an order of magnitude', () => {
        expect(CARD).toMatch(/Τάξη μεγέθους ασφαλίστρου/)
        expect(CARD).toMatch(/Rough order of magnitude/)
    })

    it('says what the real premium depends on', () => {
        expect(CARD).toMatch(/εξαρτάται από τα δικά σας στοιχεία/)
        expect(CARD).toMatch(/depends on your own details/)
    })

    it('the table records what it is and is not', () => {
        const src = readFileSync('lib/services/gap-engine/recommendation-generator.ts', 'utf-8')
        expect(src).toMatch(/not a quote and not a market average/)
    })
})
