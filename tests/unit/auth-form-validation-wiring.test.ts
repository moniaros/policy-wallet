import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The two public auth forms must report their own validation failures, in the
 * page's language, to both sighted users and screen readers.
 *
 * These are source-level assertions on purpose. Both defects live in markup a
 * browser check could not reach reliably: the consent banner is `fixed
 * inset-x-0 bottom-0 z-[120]` and sits over the bottom of the signup form, so
 * a Playwright click on the terms checkbox is intercepted by the banner rather
 * than the control under test. Reading the source is the deterministic way to
 * hold the wiring in place.
 */
describe('public auth form validation wiring', () => {
    describe('signup terms checkbox', () => {
        const src = readFileSync('app/auth/signup/SignupForm.tsx', 'utf-8')

        // The <input> tag for the terms checkbox, from `<input` to the first `/>`.
        const checkbox = src.match(/<input\s+id="signup-terms"[\s\S]*?\/>/)?.[0] ?? ''

        it('renders the terms checkbox', () => {
            expect(checkbox, 'could not find <input id="signup-terms">').not.toBe('')
        })

        it('links the checkbox to its error message with aria-describedby', () => {
            // Without this the error was announced by role="alert" when it
            // appeared, but a screen-reader user who then TABBED BACK to the
            // checkbox heard only the label again — no indication of why the
            // form would not submit (WCAG 3.3.1).
            expect(
                checkbox,
                'the terms checkbox must point at its error text via aria-describedby="signup-terms-error"'
            ).toMatch(/aria-describedby=\{[^}]*signup-terms-error[^}]*\}/)
        })

        it('marks the checkbox invalid when the error is showing', () => {
            expect(
                checkbox,
                'the terms checkbox must set aria-invalid while its error is displayed'
            ).toMatch(/aria-invalid=\{/)
        })

        it('gives the error paragraph the id aria-describedby points at', () => {
            // A dangling aria-describedby is worse than none: assistive tech
            // announces nothing and the markup looks correct.
            expect(
                src,
                'the termsAccepted error element must carry id="signup-terms-error"'
            ).toMatch(/errors\.termsAccepted[\s\S]{0,120}?id="signup-terms-error"/)
        })
    })

    describe('signin empty-field handling', () => {
        const src = readFileSync('app/auth/signin/page.tsx', 'utf-8')

        it('suppresses the browser-native validation bubble', () => {
            // `required` on the inputs made Chrome render its own bubble —
            // "Please fill out this field." — in the BROWSER's language over a
            // Greek page. Every other error on this screen is localized.
            expect(
                src,
                'the signin form must set noValidate so the app owns its error copy'
            ).toMatch(/<form\s+noValidate/)
        })

        it('replaces it with a localized message from the dictionary', () => {
            expect(
                src,
                'signin must reject an empty identifier/password with copy.fillAllFields'
            ).toMatch(/if\s*\(!identifier\s*\|\|\s*!password\)[\s\S]{0,120}?copy\.fillAllFields/)
        })
    })
})

/**
 * …and the message it names has to exist in BOTH dictionaries. `copy` is typed,
 * so a missing key fails type-check — but only the key. A key present in `el`
 * and absent from `en` (or left as the Greek string in the English file) is the
 * failure mode that ships silently.
 */
describe('fillAllFields is translated in both dictionaries', () => {
    const el = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
    const en = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

    const greekLetters = /[Ͱ-Ͽἀ-῿]/

    it('exists in the Greek dictionary, in Greek', () => {
        const value = el.match(/fillAllFields:\s*'([^'\n]*)'/)?.[1] ?? ''
        expect(value, 'fillAllFields missing from lib/i18n/translations/el.ts').not.toBe('')
        expect(value).toMatch(greekLetters)
    })

    it('exists in the English dictionary, in English', () => {
        const value = en.match(/fillAllFields:\s*'([^'\n]*)'/)?.[1] ?? ''
        expect(value, 'fillAllFields missing from lib/i18n/translations/en.ts').not.toBe('')
        expect(value, 'the English fillAllFields still holds Greek text').not.toMatch(greekLetters)
    })
})
