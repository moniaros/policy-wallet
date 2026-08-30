import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { FEATURE_GATES, type FeatureKey } from '@/lib/monetization/feature-gates'
import { UPGRADE_COPY_EL } from '@/lib/monetization/upgrade-copy.el'
import { UPGRADE_COPY_EN } from '@/lib/monetization/upgrade-copy.en'

/**
 * Upgrade copy must never name a CHEAPER tier than the one that actually
 * unlocks the feature.
 *
 * Found live, post-signup, beside an upgrade button: `PremiumInsightCards`'
 * heading said «Διαθέσιμα με το Plus» over six features whose enforced
 * requirement is `pro` (displayed **Family**), and `partner_offers` /
 * `protection_monitoring` upgrade copy said "with Plus" for the same enforced
 * tier. A paying Plus customer was being told, incorrectly, what their money
 * had bought — in an EU consumer subscription that is misleading-practice
 * exposure, not a support ticket.
 *
 * THE RULE, exactly: for a feature enforced at plan P, any mention of a tier
 * RANKED BELOW P anywhere in its upgrade copy is a violation — it understates
 * the price of the promise. Mentions of tiers above P are allowed: ladder copy
 * («Έως 10 ασφαλιστήρια (Plus) ή έως 25 (Family)» on a Plus-gated limit) names
 * dearer tiers beside their own facts, and that is truthful selling, not
 * mislabelling. This asymmetry is why the check is not simple string equality.
 *
 * UNIVERSE: every key in FEATURE_GATES, against BOTH locale copy maps,
 * imported — not a hand-list of the three features caught today.
 */

const RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 }
const DISPLAY: Record<string, string> = { free: 'Free', plus: 'Plus', pro: 'Family' }
/** Tier names as they appear in copy (Latin, in both locales). */
const TIER_WORDS: Array<{ word: RegExp; rank: number }> = [
    // "Free" collides with the English adjective («Free or discounted
    // prevention services» is a price, not a plan), so it only counts in a
    // tier context. Plus and Family have no such collision in this corpus.
    { word: /(?:\bon|\bwith|\bτο|\bthe)\s+Free\b|\bFree\s+(?:plan|tier|πλάνο)\b/g, rank: 0 },
    { word: /\bPlus\b/g, rank: 1 },
    { word: /\bFamily\b/g, rank: 2 },
]

function textOf(copy: { headline: string; body: string; primaryCta: string; benefits?: readonly string[] }): string {
    return [copy.headline, copy.body, copy.primaryCta, ...(copy.benefits ?? [])].join(' \n ')
}

/** Every tier mentioned below the enforced rank, with the offending text. */
export function cheaperTierMentions(text: string, enforced: string): string[] {
    const enforcedRank = RANK[enforced]
    const out: string[] = []
    for (const { word, rank } of TIER_WORDS) {
        if (rank >= enforcedRank) continue
        for (const m of text.matchAll(word)) {
            const ctx = text.slice(Math.max(0, m.index! - 40), m.index! + 30).replace(/\s+/g, ' ')
            out.push(`names ${DISPLAY[Object.keys(RANK)[rank] as string]} (enforced: ${DISPLAY[enforced]}) …${ctx}…`)
        }
    }
    return out
}

describe('no upgrade copy names a cheaper tier than the enforced one', () => {
    const keys = Object.keys(FEATURE_GATES) as FeatureKey[]

    it('the universe is the gate registry, and it is not empty', () => {
        expect(keys.length).toBeGreaterThan(5)
    })

    it.each([
        ['el', UPGRADE_COPY_EL],
        ['en', UPGRADE_COPY_EN],
    ] as const)('%s copy names no tier below the enforced plan', (_locale, copyMap) => {
        const violations: string[] = []
        for (const key of keys) {
            const gate = FEATURE_GATES[key]
            const copy = copyMap[key]
            if (!gate?.requiredPlan || !copy) continue
            for (const v of cheaperTierMentions(textOf(copy), gate.requiredPlan)) {
                violations.push(`${key}: ${v}`)
            }
        }
        expect(
            violations,
            `upgrade copy promising a feature for less than it costs:\n  ${violations.join('\n  ')}`
        ).toEqual([])
    })
})

describe('the post-parse card grid names the tier its own cards require', () => {
    const src = readFileSync('components/monetization/PremiumInsightCards.tsx', 'utf8')

    it('every card in the grid resolves in the gate registry', () => {
        const cardKeys = [...src.matchAll(/featureKey:\s*"(\w+)"/g)].map((m) => m[1] as FeatureKey)
        expect(cardKeys.length).toBeGreaterThanOrEqual(6)
        for (const k of cardKeys) expect(FEATURE_GATES[k], `${k} not in FEATURE_GATES`).toBeDefined()
    })

    it('the section heading names the highest tier the cards require, and no cheaper one', () => {
        const cardKeys = [...src.matchAll(/featureKey:\s*"(\w+)"/g)].map((m) => m[1] as FeatureKey)
        const maxRank = Math.max(...cardKeys.map((k) => RANK[FEATURE_GATES[k].requiredPlan]))
        const required = DISPLAY[Object.keys(RANK)[maxRank]]
        const heading = /heading:\s*\{\s*el:\s*"([^"]+)",\s*en:\s*"([^"]+)"/.exec(src)
        expect(heading, 'SECTION.heading not found — the component moved').toBeTruthy()
        for (const h of [heading![1], heading![2]]) {
            expect(h, `heading must name ${required}`).toContain(required)
            expect(cheaperTierMentions(h, Object.keys(RANK)[maxRank]), h).toEqual([])
        }
    })
})

describe('PROBE — the checker has been seen to fire', () => {
    it('flags a cheaper-tier mention', () => {
        expect(cheaperTierMentions('Unlock everything with Plus today', 'pro').join(' ')).toMatch(
            /names Plus \(enforced: Family\)/
        )
    })

    it('allows ladder copy naming dearer tiers beside their own facts', () => {
        expect(cheaperTierMentions('Up to 10 policies (Plus) or 25 (Family)', 'plus')).toEqual([])
    })

    it('and still catches Free being promised a paid feature', () => {
        expect(cheaperTierMentions('Included on Free', 'plus').length).toBe(1)
        expect(cheaperTierMentions('Free tier users see this', 'plus').length).toBe(1)
    })

    it('does not fire on "free" the adjective', () => {
        expect(cheaperTierMentions('Free or discounted prevention services', 'pro')).toEqual([])
    })
})
