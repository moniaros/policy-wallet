import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { getRoleCopy } from '@/lib/i18n/role-copy'

/**
 * The product carried three different 0-100 numbers, all colour-coded, all
 * shown to the same people:
 *
 *   - the portfolio protection score — REMOVED from the product Aug 2026
 *     (PW-MOBILE-TRANSFORM-01, halt H-001)
 *   - the per-policy check on the detail page
 *   - the agent's relationship index (a book-management signal)
 *
 * They started life as «Υγεία κάλυψης», «Βαθμός υγείας κάλυψης», «Βαθμός
 * υγείας», «Υγεία», "Coverage Health", "Health Score" and «Σκορ ανάλυσης» —
 * seven labels, mostly built on the word "health", which in a Greek insurance
 * product is also the name of a line of business. A policyholder reading «Υγεία
 * κάλυψης» on a health policy has no way to tell which sense is meant.
 *
 * One name each, and none of them says «υγεία».
 */
describe('each score has one name, and none borrows a line of business', () => {
    // The portfolio protection score's label (el.dashboard.home.protectionScore)
    // was in this list until the score was removed from the product in Aug 2026
    // (PW-MOBILE-TRANSFORM-01, halt H-001) — the key is gone with the surface.
    const labels = () => [
        el.wallet.healthScore.title,
        el.agentUi.healthScore,
        el.clientOverview.healthScore,
        getRoleCopy('el').customerList.tableHealth,
    ]

    it('no Greek label uses «υγεία»', () => {
        for (const label of labels()) {
            expect(label, `"${label}" still says υγεία`).not.toMatch(/υγεί/i)
        }
    })

    it('no English label calls itself Health', () => {
        for (const label of [
            en.wallet.healthScore.title,
            en.agentUi.healthScore,
            en.clientOverview.healthScore,
            getRoleCopy('en').customerList.tableHealth,
        ]) {
            expect(label, `"${label}" still says Health`).not.toMatch(/health/i)
        }
    })

    it('the three metrics are named distinctly', () => {
        const names = [
            el.wallet.healthScore.title,      // per-policy
            el.agentUi.healthScore,           // agent relationship
        ]
        expect(new Set(names).size).toBe(2)
    })

    it('the portfolio score label does not come back', () => {
        // The key was removed with the score itself; a translation entry named
        // for it is the first step of a quiet reintroduction.
        expect('protectionScore' in el.dashboard.home).toBe(false)
        expect('protectionScore' in en.dashboard.home).toBe(false)
    })

    it('the per-policy one no longer lists exclusions as an input', () => {
        expect(Object.keys(el.wallet.healthScore)).not.toContain('exclusions')
        expect(Object.keys(en.wallet.healthScore)).not.toContain('exclusions')
    })
})
