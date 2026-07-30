import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * aria-labels are user-facing text a screen reader announces — on a Greek-default
 * app a hardcoded English one ("Notifications", "Dismiss", "Expand") is announced
 * in English to a Greek user. lint:i18n-changed does NOT check aria-labels (these
 * shipped and passed it), so this guards the class: an aria-label must be
 * localised — a t(...)/tr(...) call, a translation-key reference (t.x.y), or a
 * ternary that includes the Greek text — never a bare English literal.
 */
const GREEK = /[Α-Ωα-ωΆ-Ώάέήίόύώϊϋΐΰ]/
const LOCALIZER_CALL = /\b\w*t\w*\(/ // t(...), tr(...), etc.

describe('no hardcoded English aria-label in customer-facing components', () => {
    it('every aria-label is localised', () => {
        const files = globSync('components/**/*.tsx').filter(
            (f) => !f.includes('.test.') && !f.includes('/admin/'),
        )

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                // Bare string form: aria-label="English text"
                const bare = line.match(/aria-label="([A-Za-z][^"]*)"/)
                if (bare) {
                    offenders.push(`${file}:${i + 1}  aria-label="${bare[1]}"`)
                    return
                }
                // Braced form: aria-label={ … }. A hardcoded English label has a
                // string literal, no Greek anywhere, and no t()/tr() localiser.
                const braced = line.match(/aria-label=\{([^}]*)\}/)
                if (braced) {
                    const expr = braced[1]
                    if (/"[A-Za-z][^"]*"|'[A-Za-z][^']*'/.test(expr) && !GREEK.test(expr) && !LOCALIZER_CALL.test(expr)) {
                        offenders.push(`${file}:${i + 1}  aria-label={${expr.trim()}}`)
                    }
                }
            })
        }

        expect(files.length).toBeGreaterThan(50) // sanity: the glob matched
        expect(
            offenders,
            `hardcoded English aria-labels (localise via t(...)/t.key):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
