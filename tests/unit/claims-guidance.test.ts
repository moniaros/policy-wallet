import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
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
        expect(steps).toMatch(/Περιορίστε τη ζημιά/)
        expect(steps).toMatch(/μην ξεκινήσετε επισκευές/)
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

/**
 * The insurer's claims number comes only from what the AI extracted
 * (acordData.policy.insurerContact) — the Insurer table has no phone field, so
 * when a document does not print one, the product does not know it.
 *
 * The card previously showed nothing in that case, on the screen someone opens
 * after a loss, while step 2 tells them to call their insurer as soon as
 * possible. Telling them where the number lives costs nothing and invents
 * nothing; putting a plausible-looking number there would have been the
 * fabrication this product is otherwise careful to avoid.
 */
describe('claims contact when no number was extracted', () => {
    it('says where to find the claims number instead of staying silent', () => {
        const card = readFileSync('components/wallet/policy-detail/ClaimsGuidanceCard.tsx', 'utf-8')
        expect(card).toMatch(/\{!insurerPhone && \(/)
        expect(card).toMatch(/copy\.claimsPhoneUnknown/)
    })

    it('points at the document and the insurer, not at a made-up number', () => {
        expect(el.wallet.policyDetailsPage.claimsPhoneUnknown).toMatch(/ασφαλιστήριο|ιστοσελίδα/)
        expect(en.wallet.policyDetailsPage.claimsPhoneUnknown).toMatch(/policy schedule|insurer/i)
        // No digits — nothing here should look like a phone number.
        expect(el.wallet.policyDetailsPage.claimsPhoneUnknown).not.toMatch(/\d{4,}/)
    })

    it('still shows the call button when a number WAS extracted', () => {
        const card = readFileSync('components/wallet/policy-detail/ClaimsGuidanceCard.tsx', 'utf-8')
        expect(card).toMatch(/\{insurerPhone && \(/)
        expect(card).toMatch(/onClick=\{onCallInsurer\}/)
    })
})
