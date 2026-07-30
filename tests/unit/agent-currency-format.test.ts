import { describe, it, expect } from 'vitest'
import { formatCurrencyCompact, formatCurrencyFull } from '@/lib/agent/format'

/**
 * Greek uses "," as the decimal separator and "." for thousands — the reverse of
 * en-GB. formatCurrencyCompact called toLocaleString with no digit options, and
 * its default is THREE fraction digits, so a €15.7305 commission printed as
 * "€15,731". To a Greek reader that is fifteen thousand seven hundred thirty-one
 * euros. The agent's "renewals at risk" KPI was wrong by a factor of 1000.
 */
describe('agent currency formatting', () => {
    it('never emits three fraction digits for sub-1000 amounts', () => {
        expect(formatCurrencyCompact(15.7305, 'el')).toBe('€15,73')
        expect(formatCurrencyCompact(15.7305, 'en')).toBe('€15.73')
    })

    it('keeps cents visible rather than rounding money to a bare integer', () => {
        expect(formatCurrencyCompact(104.87, 'el')).toBe('€104,87')
    })

    it('does not let a small amount read as thousands in Greek', () => {
        // The decimal group must be exactly two digits: "15,73" not "15,731".
        const formatted = formatCurrencyCompact(15.7305, 'el')
        const decimals = formatted.split(',')[1]
        expect(decimals).toHaveLength(2)
    })

    it('still abbreviates genuinely large amounts', () => {
        expect(formatCurrencyCompact(15_731, 'el')).toBe('€15.7K')
        expect(formatCurrencyCompact(2_000_000, 'el')).toBe('€2M')
    })

    it('agrees with formatCurrencyFull on the number of decimals', () => {
        const compact = formatCurrencyCompact(104.87, 'el').replace('€', '')
        const full = formatCurrencyFull(104.87, 'el').replace(/[^\d.,]/g, '')
        expect(compact.split(',')[1]).toEqual(full.split(',')[1])
    })
})

/**
 * Money must never be rendered with a bare `toLocaleString()`: that follows the
 * BROWSER's locale, not the app language, so a euro figure could use "." for
 * decimals while the Greek UI around it uses ",". It also defaults to three
 * fraction digits. Integer counts (tokens, operations) are unaffected.
 */
describe('no money is formatted outside the app formatters', () => {
    it('has no `€${...toLocaleString()}` renders left', async () => {
        const { globSync } = await import("../helpers/glob")
        const { readFileSync } = await import('node:fs')
        const offenders: string[] = []
        for (const file of globSync('{components,app}/**/*.tsx')) {
            const src = readFileSync(file, 'utf-8')
            // A € immediately preceding an interpolation that ends in toLocaleString().
            if (/€\$?\{[^}]*\.toLocaleString\(\)\s*\}/.test(src) || /€\{[^}]*\.toLocaleString\(\)/.test(src)) {
                offenders.push(file)
            }
        }
        expect(offenders, `bare toLocaleString on money:\n${offenders.join('\n')}`).toEqual([])
    })
})
