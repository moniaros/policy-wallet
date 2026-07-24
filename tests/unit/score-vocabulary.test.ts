import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { getRoleCopy } from '@/lib/i18n/role-copy'

/**
 * The product carries three different 0-100 numbers, all colour-coded, all
 * shown to the same people:
 *
 *   - the portfolio protection score (gap engine, category-weighted)
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
    const labels = () => [
        el.wallet.healthScore.title,
        el.dashboard.home.protectionScore,
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
            en.dashboard.home.protectionScore,
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
            el.dashboard.home.protectionScore,     // portfolio
            el.agentUi.healthScore,           // agent relationship
        ]
        expect(new Set(names).size).toBe(3)
    })

    it('the portfolio one keeps the name the whole product uses for it', () => {
        expect(el.dashboard.home.protectionScore).toBe('Βαθμολογία προστασίας')
        expect(en.dashboard.home.protectionScore).toBe('Protection score')
    })

    it('the per-policy one no longer lists exclusions as an input', () => {
        expect(Object.keys(el.wallet.healthScore)).not.toContain('exclusions')
        expect(Object.keys(en.wallet.healthScore)).not.toContain('exclusions')
    })
})
