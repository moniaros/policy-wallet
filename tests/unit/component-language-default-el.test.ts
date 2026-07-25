import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

/**
 * PolicyWallet is Greek-DEFAULT. A customer-facing component whose `language`
 * prop defaults to "en" is a latent trap: every current caller passes language,
 * but a future caller that forgets it would silently render ENGLISH for the
 * primary (Greek) audience — with nothing to catch it. Default language props to
 * "el" so the failure mode matches the market.
 *
 * (Server-side `= "en"` defaults on preferredLanguage are separately protected:
 * User.preferredLanguage is @default("el") and non-null, so those never fire.
 * This guards the component-prop surface, where a missing prop is unprotected.)
 */
describe('customer-facing component language props default to el, not en', () => {
    it('no component destructures language with a default of "en"', () => {
        const files = globSync('components/**/*.tsx').filter(
            (f) => !f.includes('.test.') && !f.includes('/admin/'),
        )
        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                // `language = "en"` inside a props destructure / param list.
                if (/\blanguage\s*=\s*["']en["']/.test(line)) {
                    offenders.push(`${file}:${i + 1}  ${line.trim()}`)
                }
            })
        }
        expect(files.length).toBeGreaterThan(50)
        expect(
            offenders,
            `component language props default to "en" (Greek-default app → default "el"):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
