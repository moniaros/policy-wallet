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
            // Two separate assertions rather than one proximity regex. The
            // original required copy.fillAllFields within 120 characters of the
            // guard clause, which is a fact about comment length, not about
            // behaviour — it broke the moment the guard was documented.
            expect(
                src,
                'signin must guard against an empty identifier or password'
            ).toMatch(/if\s*\(!identifier\s*\|\|\s*!password\)/)
            expect(
                src,
                'signin must report that failure with the localized copy.fillAllFields'
            ).toMatch(/setError\(copy\.fillAllFields\)/)
        })

        it('says WHICH field is empty, not just that something is', () => {
            // A summary banner alone gave the identical sentence whether both
            // fields were empty or only the password was, and marked no control
            // invalid — so a screen-reader user was told to "fill in all the
            // fields" on a form where one was already filled (WCAG 3.3.1).
            // Both sibling auth forms already name the failing field.
            expect(src, 'signin must track which field failed').toMatch(/setFieldErrors\(/)
            expect(
                src,
                'the identifier input must expose aria-invalid when empty'
            ).toMatch(/aria-invalid=\{fieldErrors\.identifier/)
            expect(
                src,
                'the password input must expose aria-invalid when empty'
            ).toMatch(/aria-invalid=\{fieldErrors\.password/)
            for (const id of ['signin-identifier-error', 'signin-password-error']) {
                expect(
                    src,
                    `${id} must be both referenced by aria-describedby and rendered as an element id`
                ).toMatch(new RegExp(`aria-describedby=\\{[^}]*"${id}"`))
                expect(src, `${id} must exist as an element id`).toMatch(new RegExp(`id="${id}"`))
            }
        })

        it('moves focus to the field it is complaining about', () => {
            // Without this the error is announced but the caret stays on the
            // submit button, so the user has to hunt for the control.
            expect(
                src,
                'signin must focus the first invalid control'
            ).toMatch(/identifierRef\.current\s*:\s*pwdRef\.current\)\?\.focus\(\)/)
        })
    })

    describe('signin field labelling', () => {
        const src = readFileSync('app/auth/signin/page.tsx', 'utf-8')

        // The identifier inputs had no id and their labels no htmlFor, so the
        // accessible name fell through to the placeholder — "name@example.com"
        // instead of "Email". Voice control could not address the field by its
        // visible label and the label was not clickable (WCAG 1.3.1, 2.5.3).
        const pairs: [string, string][] = [
            ['signin-email', 'the email identifier input'],
            ['signin-phone', 'the phone identifier input'],
            ['signin-password', 'the password input'],
            ['reset-email', 'the reset dialog email input'],
            ['reset-otp', 'the reset dialog OTP input'],
            ['reset-new-password', 'the reset dialog new-password input'],
            ['reset-confirm-password', 'the reset dialog confirm-password input'],
        ]

        for (const [id, description] of pairs) {
            it(`${description} has an id its label points at`, () => {
                expect(src, `missing id="${id}"`).toMatch(new RegExp(`id="${id}"`))
                expect(src, `missing <label htmlFor="${id}">`).toMatch(
                    new RegExp(`htmlFor="${id}"`)
                )
            })
        }
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
