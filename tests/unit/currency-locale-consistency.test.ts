import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { formatCurrency } from '@/lib/i18n/format'

/**
 * Greek writes money as "1.105 €" — "." groups thousands and "," is the decimal
 * separator, the reverse of en-GB. Two modules built their own Intl formatter
 * pinned to English and used it on Greek surfaces:
 *
 *   • PolicyholderHome — the policyholder's own dashboard, in the same object
 *     literal whose endDateLabel already switched locale correctly.
 *   • gap-engine/profile-gap-rules — worse, because the number sits INSIDE the
 *     Greek sentence: «Έχετε στεγαστικό δάνειο €150,000». Read by Greek rules
 *     that is €150, in the one piece of content whose job is to convey the size
 *     of an uncovered exposure.
 */
describe('money follows the reader’s locale, not the developer’s', () => {
    it('formats Greek with dot-grouping and a trailing symbol', () => {
        expect(formatCurrency(1105, 'el')).toMatch(/1\.105/)
        expect(formatCurrency(1105, 'en')).toMatch(/1,105/)
    })

    it('no module formats money in English for a Greek reader', () => {
        const offenders: string[] = []
        for (const file of globSync('{components,app,lib}/**/*.{ts,tsx}')) {
            if (file.includes('/i18n/format')) continue // the shared resolver itself
            const src = readFileSync(file, 'utf-8')

            const englishMoney = [...src.matchAll(/new Intl\.NumberFormat\(\s*["'](en[\w-]*)["'][^)]*\)/g)]
                .filter((m) => /style:\s*["']currency["']/.test(src.slice(m.index, m.index + 220)))
            // A file that ALSO builds a Greek formatter is doing per-language
            // strings deliberately (gap-engine/portfolio-rules pairs limitFmtEl
            // with limitFmtEn, one per sentence) — that is correct, not a bug.
            const hasGreekCounterpart = /new Intl\.NumberFormat\(\s*["']el[\w-]*["']/.test(src)
                || /\bel-GR\b/.test(src)
            if (englishMoney.length > 0 && !hasGreekCounterpart) {
                offenders.push(`${file} → ${englishMoney[0][1]} with no Greek counterpart`)
            }
            // A euro string built with toLocaleString("en") and no language switch.
            if (/€\$\{[^}]*toLocaleString\(["']en["']\)/.test(src) && !hasGreekCounterpart) {
                offenders.push(`${file} → toLocaleString("en")`)
            }
        }
        expect(offenders, `English-pinned money formatting:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * A premium is a contractual amount and the comparison table marks one of them
 * "lowest" — rounding to whole euros rendered €1,104.87 and €1,105.20 as the
 * same figure, hiding the difference the table exists to show.
 */
describe('premium comparison keeps cents', () => {
    it('does not round premiums to whole euros in the comparison table', () => {
        const src = readFileSync('components/wallet/PolicyComparison.tsx', 'utf-8')
        expect(src).toMatch(/minimumFractionDigits: 2/)
        expect(src).not.toMatch(/maximumFractionDigits: 0/)
    })

    it('distinguishes two premiums that round to the same euro', () => {
        expect(formatCurrency(1104.87, 'el', { decimals: 2 }))
            .not.toEqual(formatCurrency(1105.20, 'el', { decimals: 2 }))
    })
})
