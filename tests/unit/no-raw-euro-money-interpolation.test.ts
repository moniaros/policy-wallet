import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * `€{expr}` in JSX renders money as a raw euro-prefixed number with no locale
 * formatting — no thousands grouping, and the € on the wrong side for el-GR
 * ("€1500" vs the app's "1.500 €"). This recurred across billing history, the
 * health coverage card, the recommendation cards and the upgrade modal. Money
 * must go through a formatter:
 *   - insurance amounts (premiums, limits) → formatCurrency (localised suffix)
 *   - subscription prices → formatEur (the €-prefix pricing convention)
 * Never a hand-rolled `€{n}`. This guard pins the whole class tree-wide so a new
 * raw euro interpolation anywhere fails a unit test.
 */
const ROOTS = ['components', 'app']

function tsxFiles(dir: string): string[] {
    let out: string[] = []
    let entries
    try {
        entries = readdirSync(dir, { withFileTypes: true })
    } catch {
        return out
    }
    for (const e of entries) {
        const full = join(dir, e.name)
        if (e.isDirectory()) out = out.concat(tsxFiles(full))
        else if (e.name.endsWith('.tsx')) out.push(full)
    }
    return out
}

describe('no raw €{…} money interpolation anywhere in the UI', () => {
    const files = ROOTS.flatMap(tsxFiles)

    it('scans a non-trivial number of .tsx files', () => {
        expect(files.length).toBeGreaterThan(50)
    })

    it('no .tsx renders money as a raw €{expr}', () => {
        const offenders: string[] = []
        for (const f of files) {
            const src = readFileSync(f, 'utf-8')
            const matches = src.match(/€\{[^}]*\}/g)
            if (matches) offenders.push(`${f}: ${matches.join(' , ')}`)
        }
        expect(
            offenders,
            `raw euro-prefixed money interpolation(s) — route through formatCurrency ` +
            `(insurance amounts) or formatEur (subscription prices):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
