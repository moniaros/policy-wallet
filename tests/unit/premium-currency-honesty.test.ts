import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calculatePremiumFootprintDetailed } from '@/lib/wallet/premium-footprint'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const now = new Date('2026-07-24T09:00:00Z')
const live = (premiumAmount: number, premiumCurrency?: string) => ({
    id: `p-${premiumAmount}-${premiumCurrency ?? 'EUR'}`,
    status: 'active',
    endDate: new Date('2027-01-01T00:00:00Z'),
    premiumAmount,
    premiumCurrency,
})

/**
 * `premiumCurrency` is populated from the document by extraction, so a policy
 * written in sterling or francs is representable — and the detail page renders
 * it correctly, in its own currency. The wallet total then added those figures
 * to the euro ones and labelled the sum "€", because the formatter hardcoded
 * EUR. Adding across currencies without conversion yields a number that is
 * simply wrong, and nothing on screen said so.
 */
describe('the premium total is stated in one currency', () => {
    it('adds only the majority currency, and says how many it left out', () => {
        const f = calculatePremiumFootprintDetailed(
            [live(500), live(300), live(1000, 'GBP')],
            now
        )
        expect(f.currency).toBe('EUR')
        expect(f.total).toBe(800)
        expect(f.countedPolicies).toBe(2)
        expect(f.otherCurrencyCount).toBe(1)
    })

    it('follows the book when the majority is not euros', () => {
        const f = calculatePremiumFootprintDetailed(
            [live(100, 'GBP'), live(200, 'GBP'), live(999)],
            now
        )
        expect(f.currency).toBe('GBP')
        expect(f.total).toBe(300)
        expect(f.otherCurrencyCount).toBe(1)
    })

    it('treats an unset currency as euros, the market default', () => {
        const f = calculatePremiumFootprintDetailed([live(120), live(80, undefined)], now)
        expect(f.currency).toBe('EUR')
        expect(f.total).toBe(200)
        expect(f.otherCurrencyCount).toBe(0)
    })

    it('is case- and whitespace-insensitive about the code', () => {
        const f = calculatePremiumFootprintDetailed([live(120, ' eur '), live(80, 'EUR')], now)
        expect(f.otherCurrencyCount).toBe(0)
        expect(f.total).toBe(200)
    })

    it('a single-currency book is unaffected', () => {
        const f = calculatePremiumFootprintDetailed([live(500), live(300)], now)
        expect(f.total).toBe(800)
        expect(f.otherCurrencyCount).toBe(0)
    })
})

describe('the wallet shows the currency it actually summed', () => {
    const SUMMARY = strip(readFileSync('components/wallet/StatusSummary.tsx', 'utf-8'))
    const WALLET = strip(readFileSync('components/wallet/PolicyWallet.tsx', 'utf-8'))

    it('does not hardcode EUR in the formatter', () => {
        expect(SUMMARY).toMatch(/currency: premiumCurrency \|\| 'EUR'/)
        expect(SUMMARY).not.toMatch(/currency: 'EUR',\s*\n\s*maximumFractionDigits/)
    })

    it('discloses what the total leaves out, alongside the existing reasons', () => {
        expect(SUMMARY).toMatch(/otherCurrencyNote/)
        expect(SUMMARY).toMatch(/\[excludedNote, noAmountNote, otherCurrencyNote\]/)
    })

    it('is fed from the footprint, not assumed', () => {
        expect(WALLET).toMatch(/premiumCurrency=\{premiumFootprint\.currency\}/)
        expect(WALLET).toMatch(/otherCurrencyCount=\{premiumFootprint\.otherCurrencyCount\}/)
    })

    it('has the disclosure copy in both languages, singular and plural', () => {
        expect(el.status.premiumExcludesOtherCurrency).toMatch(/άλλο νόμισμα/)
        expect(el.status.premiumExcludesOtherCurrencyPlural).toMatch(/άλλο νόμισμα/)
        expect(en.status.premiumExcludesOtherCurrency).toMatch(/another currency/)
        expect(en.status.premiumExcludesOtherCurrencyPlural).toMatch(/other currencies/)
        for (const s of [
            el.status.premiumExcludesOtherCurrency,
            en.status.premiumExcludesOtherCurrency,
        ]) {
            expect(s).toMatch(/\{count\}/)
        }
    })
})

/**
 * The same defect, in a second place. The policy-comparison dialog summed every
 * selected premium and formatted the result as euros, so comparing a sterling
 * policy against euro ones produced a "Total annual cost" that was not the total
 * of anything — with the figure sitting directly beneath a table that marks one
 * policy as the cheapest.
 */
describe('the comparison total refuses to add across currencies', () => {
    const COMPARE = strip(readFileSync('components/wallet/PolicyComparison.tsx', 'utf-8'))

    it('decides comparability from the selected policies', () => {
        expect(COMPARE).toMatch(/const currencies = new Set\(/)
        expect(COMPARE).toMatch(/p\.premiumCurrency \|\| 'EUR'/)
        expect(COMPARE).toMatch(/const comparable = currencies\.size === 1/)
    })

    it('only sums when they agree, and formats in the currency it summed', () => {
        expect(COMPARE).toMatch(/comparable[\s\S]{0,200}selectedPolicies\.reduce/)
        expect(COMPARE).toMatch(/currency\s*\n?\s*\)/)
    })

    it('says why there is no total otherwise, in both languages', () => {
        expect(COMPARE).toMatch(/c\.totalMixedCurrency/)
        expect(el.wallet.comparison.totalMixedCurrency).toMatch(/διαφορετικά νομίσματα/)
        expect(en.wallet.comparison.totalMixedCurrency).toMatch(/different currencies/)
    })
})
