import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calculatePremiumFootprintDetailed } from '@/lib/wallet/premium-footprint'
import { premiumExclusionNote } from '@/lib/wallet/premium-exclusion-note'
import { getTranslations } from '@/lib/i18n'

const DASHBOARD = 'app/(protected)/dashboard/PolicyholderHome.tsx'

const inForce = (premiumAmount: number | null, premiumCurrency: string, i: number) => ({
    id: `p${i}`,
    policyNumber: `PN-${i}`,
    insurerName: 'ΕΘΝΙΚΗ',
    status: 'active',
    endDate: new Date(Date.now() + 200 * 86_400_000),
    premiumAmount,
    premiumCurrency,
})

/**
 * The policyholder dashboard's headline «Συνολικό ετήσιο ασφάλιστρο» summed
 * premiumAmount over every in-force policy inline and formatted the result as
 * euros — so a sterling policy was added to the euro figures and a policy with
 * no extracted premium counted silently as 0. `calculatePremiumFootprintDetailed`
 * exists to prevent exactly that and is what the wallet uses; the dashboard had
 * drifted onto its own arithmetic.
 *
 * These assert the behaviour the dashboard now depends on, and that it no longer
 * hand-rolls the sum.
 */
describe('the dashboard premium total goes through the audited footprint', () => {
    it('does not add across currencies', () => {
        // Two euro policies (€600, €300) and one sterling (£999). The total is
        // the euro majority, not €1,899-and-change.
        const footprint = calculatePremiumFootprintDetailed([
            inForce(600, 'EUR', 1),
            inForce(300, 'EUR', 2),
            inForce(999, 'GBP', 3),
        ])
        expect(footprint.total).toBe(900)
        expect(footprint.currency).toBe('EUR')
        expect(footprint.otherCurrencyCount).toBe(1)
    })

    it('counts a premium-less policy as excluded, not as zero', () => {
        const footprint = calculatePremiumFootprintDetailed([
            inForce(600, 'EUR', 1),
            inForce(null, 'EUR', 2),
        ])
        expect(footprint.total).toBe(600)
        // Surfaced so the card can say the figure is partial, rather than
        // implying the household's whole spend is €600.
        expect(footprint.unknownPremiumCount).toBe(1)
    })

    it('reports the majority currency so the label is not always €', () => {
        const footprint = calculatePremiumFootprintDetailed([
            inForce(500, 'GBP', 1),
            inForce(400, 'GBP', 2),
            inForce(100, 'EUR', 3),
        ])
        expect(footprint.currency).toBe('GBP')
        expect(footprint.total).toBe(900)
    })
})

describe('the dashboard no longer hand-rolls the premium sum', () => {
    const src = readFileSync(DASHBOARD, 'utf-8')
    const uncommented = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

    it('derives the total from the footprint module', () => {
        expect(uncommented).toMatch(/calculatePremiumFootprintDetailed\(/)
        // The exact reduce that added across currencies must be gone.
        expect(uncommented).not.toMatch(/reduce\(\(sum,\s*p\)\s*=>\s*sum\s*\+\s*Number\(p\.premiumAmount/)
    })

    it('formats the headline in the footprint currency, not a hardcoded EUR', () => {
        expect(uncommented).toMatch(/formatCurrencyValue\(totalAnnualPremium,\s*lang,\s*premiumCurrency\)/)
    })

    it('builds the excluded-note through the shared helper', () => {
        expect(uncommented).toMatch(/premiumExclusionNote\(/)
    })
})

/**
 * The note builder, tested behaviourally rather than by string-matching the
 * source — an earlier version of this suite only asserted the i18n key NAME
 * appeared in the file, so flipping `otherCurrencyCount > 0` to `false` (which
 * silently stops disclosing a foreign-currency policy) left the key in place and
 * passed. What the reader sees is the thing to pin.
 */
describe('the premium exclusion note says everything the total dropped', () => {
    const status = getTranslations('el').status

    it('names a foreign-currency exclusion', () => {
        const note = premiumExclusionNote(
            { otherCurrencyCount: 1, unknownPremiumCount: 0, unknownDurationCount: 0 },
            status
        )
        expect(note).toBe(status.premiumExcludesOtherCurrency.replace('{count}', '1'))
    })

    it('names a premium-less policy', () => {
        const note = premiumExclusionNote(
            { otherCurrencyCount: 0, unknownPremiumCount: 2, unknownDurationCount: 0 },
            status
        )
        expect(note).toBe(status.premiumExcludesNoAmountPlural.replace('{count}', '2'))
    })

    it('joins all three reasons when all apply', () => {
        const note = premiumExclusionNote(
            { otherCurrencyCount: 1, unknownPremiumCount: 1, unknownDurationCount: 1 },
            status
        )
        expect(note).toContain(status.premiumExcludesOtherCurrency.replace('{count}', '1'))
        expect(note).toContain(status.premiumExcludesNoAmount.replace('{count}', '1'))
        expect(note).toContain(status.premiumExcludesUnknown.replace('{count}', '1'))
        expect(note?.split(' · ')).toHaveLength(3)
    })

    it('is undefined when the total leaves nothing out', () => {
        expect(premiumExclusionNote(
            { otherCurrencyCount: 0, unknownPremiumCount: 0, unknownDurationCount: 0 },
            status
        )).toBeUndefined()
    })
})
