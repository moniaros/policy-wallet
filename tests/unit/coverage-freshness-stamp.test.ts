import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Data-freshness maturity: the platform's most authoritative-looking output —
 * the AI policy analysis — must carry an "as of" stamp so a senior
 * intermediary reads it as "computed from data as of DATE", not a timeless
 * verdict. And the stamp is Athens-pinned like the rest of the app (a raw-zone
 * render shifts the day at Athens midnight).
 *
 * (The protection score's freshness stamp was guarded here too, until the
 * score was removed from the product in Aug 2026 — PW-MOBILE-TRANSFORM-01,
 * halt H-001.)
 */
describe('the analysis carries a trustworthy freshness stamp', () => {
    it('the policy analysis "last check" is Athens-pinned, not a raw-zone render', () => {
        const src = readFileSync('app/(protected)/wallet/[id]/PolicyAnalysisTabs.tsx', 'utf-8')
        expect(src).toMatch(/formatDateTime\(lastAnalyzedAt, isGreek \? 'el' : 'en'\)/)
        // The pre-fix raw render (browser-zone, off-by-one) must not return.
        expect(src).not.toMatch(/new Date\(lastAnalyzedAt\)\.toLocaleDateString/)
    })
})
