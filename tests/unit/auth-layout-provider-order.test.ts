import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * In the auth layout, the translation dictionary must be chosen INSIDE the
 * language pin, not above it.
 *
 * TranslationsProvider picks its dictionary by reading LanguageStateContext
 * from above itself. Mounted OUTSIDE AuthLanguageProvider it read the global
 * provider's Greek default and resolved the Greek dictionary before the pin
 * set "en" below it — so /auth/signin?lang=en rendered <html lang="en"> over
 * an entirely Greek page (WCAG 3.1.1, and the language switcher showed EN as
 * already active with no control that fixed it). Only signin consumes `t`,
 * which is why its siblings looked fine and the bug survived a shipping round.
 */
describe('auth layout provider nesting', () => {
    const src = readFileSync('app/auth/layout.tsx', 'utf-8')

    it('AuthLanguageProvider wraps TranslationsProvider, not the reverse', () => {
        const pin = src.indexOf('<AuthLanguageProvider>')
        const dict = src.indexOf('<TranslationsProvider>')
        expect(pin, 'AuthLanguageProvider must be rendered').toBeGreaterThan(-1)
        expect(dict, 'TranslationsProvider must be rendered').toBeGreaterThan(-1)
        expect(
            pin,
            'AuthLanguageProvider must OPEN BEFORE TranslationsProvider — the dictionary is chosen from the language context above it, so the pin has to be the outer wrapper'
        ).toBeLessThan(dict)
    })
})
