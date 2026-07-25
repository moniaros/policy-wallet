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
