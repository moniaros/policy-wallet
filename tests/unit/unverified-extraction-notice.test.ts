import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const view = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf-8')
const page = readFileSync('app/(protected)/wallet/[id]/page.tsx', 'utf-8')

/**
 * Every analysed policy is written with reviewState "unconfirmed" (see the
 * orchestrator and extraction-enrichment), and only an agent can clear it —
 * canReviewExtraction gates on isAgentRole(). A policyholder without an advisor
 * therefore has every policy permanently unconfirmed, and was told nothing,
 * while an agent got a banner about the same data.
 *
 * They are given the FACT, not the agent's confirm action. Someone "confirming"
 * an AI extraction they have not checked against the document would be worse
 * than leaving it unconfirmed — it would launder a guess into a verification.
 */
describe('an unverified extraction says so to the person relying on it', () => {
    /**
     * The MECHANISM moved in Goal 2 and the promise nearly moved with it. The
     * page-top banner is gone; the note now sits at the point of use, beside
     * the AI chip on the summary. That is a better home — but for one commit it
     * lived ONLY in the head's attention line, which reports the single most
     * important thing, so on any policy with items to review the unverified
     * fact vanished. This guard caught it, which is why it asserts the note
     * reaches the SummaryCard rather than asserting any particular layout.
     */
    it('shows the owner a note when the extraction is unconfirmed', () => {
        expect(view).toMatch(/!canReviewExtraction && \(policy\.reviewState === 'unconfirmed' \|\| policy\.reviewState === 'flagged'\)/)
        expect(view).toMatch(/t\.wallet\.review\.ownerUnverifiedNote/)
        // …and it is actually handed to the component that renders it.
        expect(view).toMatch(/unverifiedNote=\{t\.wallet\.review\.ownerUnverifiedNote\}/)
        const summary = readFileSync('components/wallet/policy-detail/SummaryCard.tsx', 'utf-8')
        expect(summary).toMatch(/\{unverifiedNote\}/)
    })

    it('does not offer them the agent’s confirm action', () => {
        // The review CTA stays behind canReviewExtraction.
        expect(view).toMatch(/\{canReviewExtraction && \(policy\.reviewState === 'unconfirmed'/)
        expect(page).toMatch(/canReviewExtraction=\{isAgentRole\(dbUser\.roles\) && access\.canWrite\}/)
    })

    it('tells them what to do about it, in both languages', () => {
        expect(el.wallet.review.ownerUnverifiedNote).toMatch(/δεν έχουν επαληθευτεί/)
        expect(el.wallet.review.ownerUnverifiedNote).toMatch(/Ελέγξτε τα με το ασφαλιστήριό σας/)
        expect(en.wallet.review.ownerUnverifiedNote).toMatch(/have not been verified/i)
        expect(en.wallet.review.ownerUnverifiedNote).toMatch(/Check them against your policy/i)
    })

    it('does not claim the data is wrong — only that it is unchecked', () => {
        // Overstating this would be its own kind of misleading.
        expect(el.wallet.review.ownerUnverifiedNote).not.toMatch(/λάθος|εσφαλμέν/)
        expect(en.wallet.review.ownerUnverifiedNote).not.toMatch(/incorrect|wrong/i)
    })
})
