import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { annualSavingEur, annualSavingsLabel } from '@/lib/pricing/annual-savings'

/**
 * H-021 (PW-CONTENT-02): a saving from paying annually is DERIVED from the two prices.
 * «2 μήνες δωρεάν» / «περίπου 10 μήνες αντί για 12» was true for the agent plans and
 * false for the policyholder plans (Plus €39 vs €4.99 ≈ 7.8 months, Family €79 vs
 * €8.99 ≈ 8.8). The universe is every .ts/.tsx under app, components and lib,
 * enumerated from the filesystem; the probe proves the pattern bites.
 */
const ROOTS = ['app', 'components', 'lib']

// A typed month-count saving, in either language.
const TYPED_SAVING = [
    /(δύο|\d+)\s+μήνες?\s+δωρεάν/i,
    /(two|\d+)\s+months?\s+free/i,
    /Εξοικονομ(είτε|ήστε)\s+\d+\s+μήνες/i,
    /Save\s+\d+\s+months/i,
    /\d+\s+μήνες\s+αντί\s+για\s+12/i,
    /\d+\s+months\s+instead\s+of\s+12/i,
    /annualSavingsMonths/, // a stored month count is the same defect as a typed one
    /Εξοικονομ(είτε|ήστε)\s+~?\d+\s*€/i, // a typed euro saving
    /Save\s+~?€\s?\d+/i,
    />\s*-\s?\d+\s?%\s*</, // a typed percentage chip on an annual toggle
    /annualSavings\s*:\s*\{\s*el:\s*"Έκπτωση"/, // an unconditional «Έκπτωση» chip
    /με έκπτωση σε σχέση με τη μηνιαία/i, // an unconditional discount statement beside live prices
]

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        const s = statSync(p)
        if (s.isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}

/** Comments may explain the rule ("two months free" is true for agents); code may not state it. */
function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function findings(src: string): string[] {
    const code = stripComments(src)
    return TYPED_SAVING.flatMap((re) => (re.test(code) ? [re.source] : []))
}

describe('annual savings are derived from prices, never typed (H-021)', () => {
    it('no source file types a month-count saving', () => {
        const files = ROOTS.flatMap((r) => walk(r))
        expect(files.length).toBeGreaterThan(500)
        const offenders = files.filter((f) => findings(readFileSync(f, 'utf-8')).length > 0)
        expect(offenders, `typed annual saving in: ${offenders.join(', ')}`).toEqual([])
    })

    it('probe: the pattern turns red on a typed saving', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/annual-savings-typed.ts.txt', 'utf-8')
        expect(findings(probe).length).toBeGreaterThanOrEqual(6)
    })

    it('the label is computed from the numbers and states the real policyholder saving', () => {
        // Production rows read 2026-10-22: Plus €4.99/€39, Family €8.99/€79.
        expect(annualSavingEur(4.99, 39)).toBe(21)
        expect(annualSavingEur(8.99, 79)).toBe(29)
        expect(annualSavingsLabel(4.99, 39)?.el).toContain('21')
        expect(annualSavingsLabel(8.99, 79)?.en).toContain('29')
        // Annual no cheaper than monthly states nothing.
        expect(annualSavingsLabel(5, 60)).toBeNull()
    })
})
