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
 *
 * Scope: rendered UI (.tsx). The audit-log description strings in
 * app/(protected)/admin/billing-actions.ts keep a raw `€${n.toFixed(2)}` on
 * purpose — they are stored records, where a deterministic, locale-independent,
 * cent-exact shape (uniform with rows already written) beats display
 * convention, and the exact figure sits in structured metadata beside each
 * message. See the docblock there before "fixing" them.
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

/**
 * Both raw shapes: the JSX interpolation `€{expr}` AND the template-literal
 * form `€${expr}`. The first version matched only the JSX shape, so the same
 * mistake written inside a template string — the other way a component builds
 * display text — was invisible. The tree was verified clean of both before the
 * widening, so this tightens the guard without touching any code.
 */
const RAW_EURO = /€\{[^}]*\}|€\$\{[^}]*\}/g

/** Every raw euro interpolation in `src`, as printable evidence. */
export function rawEuroOffenders(file: string, src: string): string[] {
    const matches = src.match(RAW_EURO)
    return matches ? [`${file}: ${matches.join(' , ')}`] : []
}

/**
 * LIVE DEBT found the moment the matcher learned the template shape (Phase 6
 * guard audit, 2026-08-27): seven files rendered money as €${expr} while the
 * guard sat green over every one of them. All seven were routed through the
 * formatters the same day (subscription/billing money → formatEur; the
 * MedicScorecard value-at-risk, an insurance amount → formatCurrency; the
 * 4-decimal AI cost → formatCurrency with decimals: 4, because formatEur's
 * 2dp rounding would show €0.00 for a real sub-cent charge).
 *
 * The ratchet stays: this list may only SHRINK. Each entry is asserted
 * still-red below, so fixing a file forces its row out, and no NEW offender
 * can hide behind an old one. It is empty today — keep it that way.
 */
const KNOWN_RAW_EURO_DEBT: string[] = []

describe('no raw €{…} money interpolation anywhere in the UI', () => {
    const files = ROOTS.flatMap(tsxFiles)

    it('scans a non-trivial number of .tsx files', () => {
        expect(files.length).toBeGreaterThan(50)
    })

    it('no .tsx renders money as a raw €{expr} — outside the pinned debt', () => {
        const offenders = files
            .filter((f) => !KNOWN_RAW_EURO_DEBT.includes(f))
            .flatMap((f) => rawEuroOffenders(f, readFileSync(f, 'utf-8')))
        expect(
            offenders,
            `raw euro-prefixed money interpolation(s) — route through formatCurrency ` +
            `(insurance amounts) or formatEur (subscription prices):\n${offenders.join('\n')}`,
        ).toEqual([])
    })

    it('the debt list only shrinks — a fixed file must delete its row', () => {
        for (const f of KNOWN_RAW_EURO_DEBT) {
            expect(
                rawEuroOffenders(f, readFileSync(f, 'utf-8')).length,
                `${f} no longer interpolates raw euros — delete its KNOWN_RAW_EURO_DEBT row`
            ).toBeGreaterThan(0)
        }
    })
})

/**
 * PROBES — proven against the lines that actually shipped: UpgradeModal.tsx as
 * it stood before 9a91154c routed subscription prices through the formatter.
 */
describe('the matcher is proven against the pre-fix source (9a91154c~1)', () => {
    it('flags the modal price lines, and the message names file and expression', () => {
        const preFix = [
            '{pick(MODAL_COPY.plusPrefix, language)} €{plusPrice}{suffix}',
            '{pick(MODAL_COPY.starterPrefix, language)} €{starterPrice}{suffix}',
        ].join('\n')
        const offenders = rawEuroOffenders('components/monetization/UpgradeModal.tsx', preFix)
        expect(offenders).toHaveLength(1)
        expect(offenders[0]).toContain('components/monetization/UpgradeModal.tsx')
        expect(offenders[0]).toContain('€{plusPrice}')
        expect(offenders[0]).toContain('€{starterPrice}')
    })

    it('flags the template-literal form the first version could not see', () => {
        expect(rawEuroOffenders('x.tsx', 'const line = `Σύνολο: €${total}`')).toHaveLength(1)
    })

    it('does not flag money routed through a formatter, or a bare € in copy', () => {
        for (const clean of [
            '<span>{formatCurrency(premium, language)}</span>',
            '<span>{formatEur(plusPrice)}</span>',
            'const label = t("Ποσό σε €", "Amount in €")',
        ]) {
            expect(rawEuroOffenders('x.tsx', clean), clean).toEqual([])
        }
    })
})
