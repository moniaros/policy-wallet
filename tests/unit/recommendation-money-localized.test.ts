import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * RecommendationCards rendered the indicative premium range and the
 * order-of-magnitude cost as raw `€{n}` — an English-style money format (€
 * prefix, no thousands grouping) on a Greek-default app, where every other
 * amount is localised via formatCurrency (el-GR places € as a suffix: "1.500 €").
 * Both must go through the shared formatter so the Greek default audience sees
 * consistent, locale-correct money.
 */
const SRC = readFileSync('components/coverage/RecommendationCards.tsx', 'utf-8')

describe('RecommendationCards localises money via the shared formatter', () => {
    it('has no raw €{…} money interpolation', () => {
        // `€{` = a euro sign immediately followed by a JSX/template expression,
        // i.e. an unlocalised "€<number>" render.
        expect(SRC).not.toMatch(/€\{/)
    })

    it('formats the premium range and estimated cost via formatCurrency', () => {
        expect(SRC).toContain('formatCurrency(rec.matchedProduct.premiumRangeLow')
        expect(SRC).toContain('formatCurrency(rec.matchedProduct.premiumRangeHigh')
        expect(SRC).toContain('formatCurrency(rec.estimatedCostEur')
    })
})
