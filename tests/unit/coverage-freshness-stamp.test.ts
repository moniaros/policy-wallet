import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Data-freshness maturity: the platform's most authoritative-looking outputs —
 * the AI policy analysis and the protection score — must carry an "as of" stamp
 * so a senior intermediary reads them as "computed from data as of DATE", not a
 * timeless verdict. And every such stamp is Athens-pinned like the rest of the
 * app (a raw-zone render shifts the day at Athens midnight).
 */
describe('the analysis + score carry a trustworthy freshness stamp', () => {
    it('the policy analysis "last check" is Athens-pinned, not a raw-zone render', () => {
        const src = readFileSync('app/(protected)/wallet/[id]/PolicyAnalysisTabs.tsx', 'utf-8')
        expect(src).toMatch(/formatDateTime\(lastAnalyzedAt, isGreek \? 'el' : 'en'\)/)
        // The pre-fix raw render (browser-zone, off-by-one) must not return.
        expect(src).not.toMatch(/new Date\(lastAnalyzedAt\)\.toLocaleDateString/)
    })

    it('the protection score shows an "as of" date, gated on a real timestamp', () => {
        const src = readFileSync('components/coverage/ProtectionScoreCard.tsx', 'utf-8')
        // Only rendered when analyzedAt exists — no false precision when nothing
        // has been deep-analyzed.
        expect(src).toMatch(/\{analyzedAt && \(/)
        expect(src).toMatch(/\{copy\.analyzedOn\} \{formatDate\(analyzedAt, lang\)\}/)
        expect(src).toContain('Βάσει ανάλυσης της')
        expect(src).toContain('Based on analysis from')
    })

    it('coverage-insights feeds the score the most recent deep-analysis date', () => {
        const src = readFileSync('app/(protected)/coverage-insights/page.tsx', 'utf-8')
        expect(src).toMatch(/const latestAnalyzedAt = policies\.reduce/)
        expect(src).toMatch(/analyzedAt=\{latestAnalyzedAt\}/)
    })
})
