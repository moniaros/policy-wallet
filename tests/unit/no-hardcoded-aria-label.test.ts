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
 *
 * The universe is components/ AND app/ (admin excluded — staff-only surfaces).
 * The first version globbed components/ only, and the Phase 6 guard audit found
 * the class alive under app/: the password-reset page announced "Hide password" /
 * "Show password" in English while its signup sibling localised the same toggle.
 */
const GREEK = /[Α-Ωα-ωΆ-Ώάέήίόύώϊϋΐΰ]/
const LOCALIZER_CALL = /\b\w*t\w*\(/ // t(...), tr(...), etc.

/** `file:line  offence` for every hardcoded-English aria-label in the source. */
function hardcodedAriaLabels(src: string, file: string): string[] {
    const offenders: string[] = []
    src.split('\n').forEach((line, i) => {
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
    return offenders
}

/**
 * Live offenders found by the Phase 6 guard audit the day the universe was
 * widened to app/. SHRINK-ONLY: localising a file must delete its row (a
 * stale row fails below). Do not add rows.
 *
 * - reset-password: the show/hide-password toggles announce English to every
 *   Greek screen-reader user; SignupForm localises the identical control.
 */
const KNOWN_ENGLISH_ARIA_DEBT = [
    'app/auth/reset-password/page.tsx',
]

describe('no hardcoded English aria-label in customer-facing components', () => {
    const files = [
        ...globSync('components/**/*.tsx'),
        ...globSync('app/**/*.tsx'),
    ].filter((f) => !f.includes('.test.') && !f.includes('/admin/'))

    it('every aria-label is localised', () => {
        const offenders: string[] = []
        for (const file of files) {
            if (KNOWN_ENGLISH_ARIA_DEBT.includes(file)) continue
            offenders.push(...hardcodedAriaLabels(readFileSync(file, 'utf-8'), file))
        }

        expect(files.length).toBeGreaterThan(50) // sanity: the glob matched
        expect(
            offenders,
            `hardcoded English aria-labels (localise via t(...)/t.key):\n${offenders.join('\n')}`,
        ).toEqual([])
    })

    it('the known debt is still red — localising a file must delete its row', () => {
        for (const file of KNOWN_ENGLISH_ARIA_DEBT) {
            expect(
                hardcodedAriaLabels(readFileSync(file, 'utf-8'), file).length,
                `${file} no longer has a hardcoded aria-label — delete its debt row`,
            ).toBeGreaterThan(0)
        }
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the matcher against the AUTHENTIC pre-fix
 * shapes (9eaa7014 removed exactly these from the shell and cards), and the
 * localised shapes that must stay silent.
 */
describe('the matcher is proven on authentic sources', () => {
    it('flags the shapes that shipped', () => {
        expect(hardcodedAriaLabels(`                aria-label="Notifications"`, 'probe.tsx')).toHaveLength(1)
        expect(hardcodedAriaLabels(`                        aria-label="Dismiss"`, 'probe.tsx')).toHaveLength(1)
        expect(
            hardcodedAriaLabels(`                        aria-label={collapsed ? "Expand" : "Collapse"}`, 'probe.tsx'),
        ).toHaveLength(1)
        // The live debt shape — the reset-password toggle, verbatim.
        expect(
            hardcodedAriaLabels(
                `<button type="button" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "Hide password" : "Show password"}>`,
                'probe.tsx',
            ),
        ).toHaveLength(1)
    })

    it('stays silent on localised labels', () => {
        // The post-fix shape from SignupForm: a bilingual t() helper.
        expect(
            hardcodedAriaLabels(
                `aria-label={showPassword ? t("Απόκρυψη κωδικού", "Hide password") : t("Εμφάνιση κωδικού", "Show password")}`,
                'probe.tsx',
            ),
        ).toEqual([])
        // A translation-key reference.
        expect(hardcodedAriaLabels(`aria-label={t.nav.notifications}`, 'probe.tsx')).toEqual([])
        // A Greek ternary without a helper.
        expect(
            hardcodedAriaLabels(`aria-label={collapsed ? 'Ανάπτυξη' : 'Σύμπτυξη'}`, 'probe.tsx'),
        ).toEqual([])
    })
})
