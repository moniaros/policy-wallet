import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const legal = readFileSync('lib/legal/legal-content.ts', 'utf-8')

/**
 * The Terms stated "Starter €2.99/month, PolicyWallet Plus €7.99/month" as
 * fact, in both languages. The plan catalogue is admin-managed in the database
 * and charges €9.99 for the tier displayed as "PolicyWallet Plus" — so the
 * legal page named a price the product does not take.
 *
 * Found by refusing to write off a "flaky" E2E test: money-path.spec.ts asserts
 * €7.99 because that WAS the price when it was written. Re-running with
 * --retries=0 turned 2 "flaky" into 3 hard failures, and chasing the price led
 * here. The retry had been hiding a real contradiction.
 *
 * The same sentence already defers to "the price shown ... and confirmed before
 * you complete the purchase", so the figures were redundant as well as wrong.
 * A number that must be hand-synced with an admin-editable catalogue will drift
 * again; the clause now points at the pricing page instead.
 */
describe('legal text does not name prices it cannot guarantee', () => {
    it('states no specific monthly price in the subscriptions clause', () => {
        // Any bare €N.NN / N,NN € in the legal content is a hand-synced figure.
        const prices = [...legal.matchAll(/€\s?\d+[.,]\d{2}|\d+,\d{2}\s?€/g)].map((m) => m[0])
        expect(prices, `hardcoded prices in legal copy:\n${prices.join('\n')}`).toEqual([])
    })

    it('still tells the reader where the authoritative price is', () => {
        expect(legal).toMatch(/price shown on the pricing page and confirmed before you complete the purchase/)
        expect(legal).toMatch(/τιμή που εμφανίζεται στη σελίδα τιμολόγησης και επιβεβαιώνεται/)
    })

    it('keeps the rest of the billing clause intact', () => {
        // Renewal, cancellation and price-change notice are separate promises.
        expect(legal).toMatch(/renew automatically at the end of each billing period/)
        expect(legal).toMatch(/If plan prices change, you will be notified in advance/)
    })
})
