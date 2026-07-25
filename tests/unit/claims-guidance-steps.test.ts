import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * The generic claim-guidance steps in ClaimsGuidanceCard render as isolated
 * paragraphs (each step is one <p>, no list nested inside). A step whose
 * description ends with a colon promises an inline list that never follows.
 *
 * Step 4 used to read "Late claims can be rejected. Deadlines detected in your
 * policy:" — the colon dangled, and worse, it asserted deadlines WERE detected
 * while the dedicated deadlines panel on the same screen could simultaneously say
 * "No specific deadlines were detected". A self-contradiction on the page a
 * policyholder opens right after a loss. The real deadlines live in their own
 * data-backed panel; the editorial steps stay generic.
 */
const stepDescKeys = [
    'claimStep1Desc',
    'claimStep2Desc',
    'claimStep3Desc',
    'claimStep4Desc',
] as const

describe('generic claim-guidance steps are self-contained (no dangling list promise)', () => {
    for (const t of [{ name: 'el', copy: el.wallet.policyDetailsPage }, { name: 'en', copy: en.wallet.policyDetailsPage }]) {
        it(`${t.name}: no step description ends with a colon`, () => {
            for (const key of stepDescKeys) {
                const value = (t.copy as unknown as Record<string, string>)[key]
                expect(value, `${t.name}.${key} missing`).toBeTruthy()
                expect(value.trimEnd().endsWith(':'), `${t.name}.${key} dangles a colon: "${value}"`).toBe(false)
            }
        })
    }

    it('step 4 no longer asserts deadlines were detected (that panel decides that)', () => {
        // The assertion that contradicted the "no deadlines detected" panel.
        expect(en.wallet.policyDetailsPage.claimStep4Desc.toLowerCase()).not.toContain('deadlines detected')
        expect(el.wallet.policyDetailsPage.claimStep4Desc).not.toContain('εντοπίστηκαν')
        // Still carries the substantive warning.
        expect(en.wallet.policyDetailsPage.claimStep4Desc.toLowerCase()).toContain('reject')
        expect(el.wallet.policyDetailsPage.claimStep4Desc).toMatch(/απορριφθ/)
    })
})
