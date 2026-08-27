import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

/**
 * lint:i18n-changed (CI) only scans files changed in the current diff — fast and
 * non-regressive, but blind to pre-existing debt in untouched files. That blind
 * spot let a string of hardcoded English literals ship on this branch's surfaces
 * (the "Alert" security badge, the offline/online toasts, …). The checker itself
 * supports a full-tree mode (`--all` / SCAN_ALL=1) for exactly this cleanup pass.
 *
 * This guard runs that full-tree scan and requires ZERO issues, so a hardcoded
 * toast/ternary literal anywhere in the tree fails a unit test — not just when
 * that file happens to be in the diff. Intentional exceptions use the checker's
 * own `// i18n-hardcoded-ignore` marker.
 */
describe('no hardcoded user-facing strings anywhere in the tree', () => {
    it('check-i18n-hardcoded.js --all reports zero issues', () => {
        let ok = true
        let output = ''
        try {
            output = execSync('node scripts/check-i18n-hardcoded.js --all', {
                encoding: 'utf-8',
                stdio: 'pipe',
            })
        } catch (err) {
            ok = false
            const e = err as { stdout?: string; stderr?: string }
            output = `${e.stdout ?? ''}${e.stderr ?? ''}`
        }
        expect(ok, `full-tree i18n check found hardcoded strings:\n${output}`).toBe(true)
    })
})

/**
 * RED-PROOF (Phase 6 guard audit). The test above delegates everything to
 * scripts/check-i18n-hardcoded.js — so a regression in the CHECKER's
 * heuristics (a rule regex gutted, an allowlist grown too wide) turns this
 * guard vacuous while it keeps printing "passed". The checker exports its
 * scanner, so the same function CI runs is probed here against the AUTHENTIC
 * offender shapes it exists for — the offline/online toasts localised in
 * 962af969, the bilingual-ternary class, the UI-visible fallback class — and
 * the shapes it must allow.
 *
 * KNOWN LIMIT, on the record: scanFiles() filters to `.tsx`, so hardcoded
 * strings in `.ts` files (client hooks, services building UI text) are outside
 * the checker's universe by design — CLAUDE.md documents the check as
 * `.tsx`-scoped.
 */
import { createRequire } from 'node:module'
const requireCjs = createRequire(import.meta.url)
const checker = requireCjs('../../scripts/check-i18n-hardcoded.js') as {
    scanContent: (content: string, filePath: string) => { rule: string; line: number }[]
}

describe('the delegated checker is proven on authentic offenders', () => {
    it('flags the offline/online toasts exactly as they shipped', () => {
        const rules = checker
            .scanContent(
                [
                    '            toast.success("You are back online", {',
                    '            toast.warning("You are offline. Showing cached data.", {',
                ].join('\n'),
                'probe.tsx',
            )
            .map((f) => f.rule)
        expect(rules).toEqual(['literal-toast', 'literal-toast'])
    })

    it('flags a bilingual ternary and a UI-visible fallback literal', () => {
        expect(
            checker.scanContent(`const label = language === 'el' ? 'Αποθήκευση' : 'Save'`, 'probe.tsx')
                .map((f) => f.rule),
        ).toEqual(['bilingual-ternary'])
        expect(
            checker.scanContent(`<Field label={policy.name || "Untitled policy"} />`, 'probe.tsx')
                .map((f) => f.rule),
        ).toEqual(['literal-fallback'])
    })

    it('allows locale literals, the em-dash fallback, and the ignore marker', () => {
        expect(checker.scanContent(`const locale = language === 'el' ? 'el-GR' : 'en-GB'`, 'probe.tsx')).toEqual([])
        expect(checker.scanContent(`<Field label={policy.name || '—'} />`, 'probe.tsx')).toEqual([])
        expect(
            checker.scanContent(
                `toast.error("probe literal") // i18n-hardcoded-ignore`,
                'probe.tsx',
            ),
        ).toEqual([])
    })
})
