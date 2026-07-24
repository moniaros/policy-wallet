import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { getBranchContent } from '@/lib/insurance/content'

const elClaims = el.wallet.policyDetailsPage
const enClaims = en.wallet.policyDetailsPage

/**
 * Every branch's own claim steps lead with safety and limiting further damage —
 * home says «Περιόρισε τη ζημιά αν είναι ασφαλές (π.χ. κλείσε τον γενικό
 * διακόπτη νερού) — μην ξεκινήσεις επισκευές πριν την καταγραφή», business says
 * secure the premises and do not discard damaged items before the adjuster,
 * boat puts the safety of those aboard first.
 *
 * The GENERIC fallback — used when a policy's line of business is not in the
 * taxonomy — led with "Document what happened" instead. That inverts the order
 * on the one path with no branch-specific guidance to fall back on, and the duty
 * to mitigate is a policy CONDITION, not just good practice: failing to take
 * reasonable steps to limit a loss can reduce the settlement. Telling someone to
 * photograph first while water spreads is materially worse advice.
 */
describe('generic claims guidance leads with safety and mitigation', () => {
    it('names the duty to limit the damage before documenting', () => {
        expect(elClaims.claimStep1Desc).toMatch(/περιορίστε τη ζημιά/)
        expect(enClaims.claimStep1Desc).toMatch(/limit the damage/i)
    })

    it('says plainly that not doing so can cost the policyholder money', () => {
        expect(elClaims.claimStep1Desc).toMatch(/μπορεί να μειώσει την αποζημίωση/)
        expect(enClaims.claimStep1Desc).toMatch(/can reduce your settlement/i)
    })

    it('still warns against repairing before the loss is recorded', () => {
        expect(elClaims.claimStep1Desc).toMatch(/μην ξεκινήσετε επισκευές/)
        expect(enClaims.claimStep1Desc).toMatch(/not start repairs/i)
    })

    it('keeps the documentation advice it already had', () => {
        expect(elClaims.claimStep1Desc).toMatch(/φωτογραφίστε/)
        expect(elClaims.claimStep1Desc).toMatch(/αστυνομία/)   // police, if injury or dispute
        expect(enClaims.claimStep1Desc).toMatch(/photograph/i)
        expect(enClaims.claimStep1Desc).toMatch(/police/i)
    })

    it('still frames the whole card as guidance, not legal advice', () => {
        expect(elClaims.claimsDisclaimer).toMatch(/όχι νομική συμβουλή/)
        expect(enClaims.claimsDisclaimer).toMatch(/not legal advice/i)
    })
})

/**
 * The branch content is the strongest insurance writing in the product; these
 * assert the specifics a claims director would look for, so a well-meaning
 * "simplification" cannot quietly remove them.
 */
describe('branch claim steps keep their operative detail', () => {
    it('home tells the policyholder to stop the damage spreading', () => {
        const steps = getBranchContent('home')?.claimsSteps?.map((s) => s.el).join(' ') ?? ''
        expect(steps).toMatch(/Περιόρισε τη ζημιά/)
        expect(steps).toMatch(/μην ξεκινήσεις επισκευές/)
    })

    it('motor tells them not to sign an admission of fault when unsure', () => {
        const steps = getBranchContent('motor')?.claimsSteps?.map((s) => s.el).join(' ') ?? ''
        expect(steps).toMatch(/μην υπογράψετε δήλωση υπαιτιότητας/)
    })

    it('business keeps the turnover evidence that business interruption is paid on', () => {
        const steps = getBranchContent('business')?.claimsSteps?.map((s) => s.el).join(' ') ?? ''
        expect(steps).toMatch(/τζίρου/)
    })

    it('boat puts people first and warns about agreeing salvage costs', () => {
        const steps = getBranchContent('boat')?.claimsSteps?.map((s) => s.el).join(' ') ?? ''
        expect(steps).toMatch(/ασφάλεια των επιβαινόντων/)
        expect(steps).toMatch(/ναυαγιαίρεσης/)
    })
})
