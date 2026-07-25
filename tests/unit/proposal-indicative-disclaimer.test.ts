import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * An advisor→client proposal shows a firm premium and an "Accept" CTA. Without a
 * qualifier, a client can read "Accept" as binding cover and believe they are
 * insured before the insurer actually issues the policy — an uninsured-loss
 * dispute waiting to happen, and a misrepresentation a compliance officer would
 * flag under IDD (Law 4583/2018). The app already applies this "the insurer's
 * terms prevail" discipline to AI outputs, claims and exclusions; the proposal —
 * a more consequential, advisor-originated recommendation — must carry the same.
 *
 * This guard pins three things so the disclaimer can't be silently dropped or
 * hollowed out:
 *   1. ProposalCard renders t.…proposals.proposalDisclaimer to the client.
 *   2. Both languages define proposalDisclaimer with substantive content
 *      (indicative/not-binding + the insurer's documentation governs).
 */
const CARD = readFileSync('components/collaboration/ProposalCard.tsx', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

function proposalDisclaimer(src: string): string | null {
    const m = src.match(/proposalDisclaimer:\s*"([^"]*)"/)
    return m ? m[1] : null
}

describe('advisor proposal carries an indicative / not-binding disclaimer', () => {
    it('ProposalCard renders the proposalDisclaimer to the client view', () => {
        expect(
            /proposals\.proposalDisclaimer/.test(CARD),
            'ProposalCard.tsx must render t.collaboration.proposals.proposalDisclaimer',
        ).toBe(true)
        // It must be in the policyholder-facing branch (the client / preview view),
        // not merely defined — the client is who could mistake "Accept" for cover.
        expect(
            /viewerRole === "policyholder"/.test(CARD),
            'the disclaimer must render in the policyholder (client/preview) view',
        ).toBe(true)
    })

    it('English disclaimer states it is not binding and the insurer governs terms', () => {
        const en = proposalDisclaimer(EN)
        expect(en, 'en.ts proposalDisclaimer missing').toBeTruthy()
        expect(en!.toLowerCase()).toContain('binding')
        expect(en!.toLowerCase()).toContain('insurer')
    })

    it('Greek disclaimer states it is not binding and the insurer governs terms', () => {
        const el = proposalDisclaimer(EL)
        expect(el, 'el.ts proposalDisclaimer missing').toBeTruthy()
        // «δεσμευτικ»(-ό/-ού) = binding; «ασφαλιστ» = insurer / policy stem.
        expect(el).toMatch(/δεσμευτικ/)
        expect(el).toMatch(/ασφαλιστ/)
    })
})
