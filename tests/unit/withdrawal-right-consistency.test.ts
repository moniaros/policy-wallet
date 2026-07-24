import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { getLegalContent } from '@/lib/legal/legal-content'

/**
 * The Terms grant a statutory right: withdraw within 14 calendar days of the
 * subscription starting and the price is refunded, reduced pro rata for the part
 * already provided (ν. 2251/1994, Directive 2011/83/EU).
 *
 * The in-product cancellation dialog said, flatly, «δεν γίνεται μερική
 * επιστροφή χρημάτων για το υπόλοιπο διάστημα» / "there is no partial refund for
 * the remaining time" — contradicting the product's own binding document, at the
 * exact moment a subscriber is deciding, and in the direction that discourages
 * them from exercising a consumer right.
 */
describe('the cancellation dialog does not deny the withdrawal right', () => {
    const elBody = el.billing.cancelConfirmBody
    const enBody = en.billing.cancelConfirmBody

    it('the Terms do grant it', () => {
        const terms = JSON.stringify(getLegalContent('el'))
        expect(terms).toMatch(/δικαίωμα να υπαναχωρήσετε/)
        expect(terms).toMatch(/14 ημερολογιακών ημερών/)
        expect(terms).toMatch(/μειωμένο αναλογικά/)
    })

    it('no longer states categorically that no partial refund exists', () => {
        expect(elBody).not.toMatch(/δεν γίνεται μερική επιστροφή χρημάτων για το υπόλοιπο διάστημα/)
        expect(enBody).not.toMatch(/there is no partial refund for the remaining time/i)
    })

    it('names the 14-day right and the pro-rata refund', () => {
        expect(elBody).toMatch(/14 ημερών/)
        expect(elBody).toMatch(/δικαίωμα υπαναχώρησης/)
        expect(elBody).toMatch(/αναλογική επιστροφή/)
        expect(enBody).toMatch(/14 days/)
        expect(enBody).toMatch(/right of withdrawal/i)
        expect(enBody).toMatch(/pro-rata refund/i)
    })

    it('still tells the truth about what cancelling alone does', () => {
        // cancel_at_period_end: access continues, no automatic money back.
        expect(elBody).toMatch(/μέχρι το τέλος της περιόδου που έχετε ήδη πληρώσει/)
        expect(elBody).toMatch(/δεν επιστρέφει χρήματα για το υπόλοιπο διάστημα/)
        expect(enBody).toMatch(/until the end of the period you have already paid for/)
        expect(enBody).toMatch(/does not by itself refund the remaining time/)
    })

    it('gives the route the Terms specify for exercising it', () => {
        const terms = JSON.stringify(getLegalContent('el'))
        expect(terms).toMatch(/info@policywallet\.gr/)
        expect(elBody).toMatch(/info@policywallet\.gr/)
        expect(enBody).toMatch(/info@policywallet\.gr/)
    })
})
