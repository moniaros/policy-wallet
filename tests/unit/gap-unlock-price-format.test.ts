import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The one paid B2C CTA (gap-report unlock) showed the price as «3€» in Greek
 * but «€3» in English. The app's SaaS-price convention (formatEur, used in the
 * upgrade modal Greek users already see) is a €-PREFIX in both languages, so the
 * Greek «3€» was the outlier. Keep both €-prefixed and consistent.
 */
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

describe('gap-unlock CTA price is €-prefixed in both languages', () => {
    it('the Greek suffix uses «€3», not the digit-then-€ form', () => {
        expect(EL).toContain("unlockCtaSuffix: 'κενά — €3'")
        // No "<digit>€" suffix format anywhere in that key.
        expect(EL).not.toMatch(/unlockCtaSuffix: '[^']*\d€/)
    })

    it('the English suffix uses «€3»', () => {
        expect(EN).toMatch(/unlockCtaSuffix: '[^']*€3'/)
    })
})
