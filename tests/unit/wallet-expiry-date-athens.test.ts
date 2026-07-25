import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

/**
 * A policy's expiry date is a CONTRACTUAL date. Rendering it with a raw
 * `toLocaleDateString({ timeZone: 'UTC' })` shows the previous day for a policy
 * ending at Athens midnight — and disagrees with the `daysUntilExpiry` shown
 * beside it, which is computed in Athens. PolicyCard and PolicyWallet both did
 * this; they now use the Athens-pinned shared `formatDate`.
 *
 * Event/timestamp dates (uploadedAt, notification times) render in the viewer's
 * local zone and use `toLocaleDateString` WITHOUT `timeZone: 'UTC'` — allowed.
 */
describe('wallet renders contractual expiry dates in Athens, not UTC', () => {
    it('no component renders a CONTRACTUAL date via toLocaleDateString pinned to UTC', () => {
        // Fixed editorial/document dates (an article's "last updated", the legal
        // doc date) are pinned to UTC on purpose — a fixed calendar date rendered
        // from an ISO string, not a policyholder-specific contractual date, so no
        // off-by-one risk. Everything else must render contractual dates in Athens.
        const EXEMPT = new Set([
            'app/(public)/guides/GuidesIndexClient.tsx',
            'app/(public)/guides/[slug]/GuideArticleClient.tsx',
            'components/legal/LegalDocumentPage.tsx',
        ])
        const offenders: string[] = []
        for (const file of globSync('{components,app}/**/*.tsx')) {
            if (EXEMPT.has(file)) continue
            const src = readFileSync(file, 'utf-8')
            if (/toLocaleDateString\([^)]*['"]UTC['"]/.test(src)) offenders.push(file)
        }
        expect(offenders, `raw UTC date render:\n${offenders.join('\n')}`).toEqual([])
    })

    it('formatPolicyDate (shared policy-detail date formatter) pins Athens', () => {
        // Used for every start/end/renewal date on the policy-detail page.
        const SRC = readFileSync('lib/wallet/policy-detail.ts', 'utf-8')
        expect(SRC).toMatch(/toLocaleDateString\(locale,\s*\{\s*timeZone:\s*APP_TIME_ZONE/)
        expect(SRC).not.toMatch(/toLocaleDateString\(locale\)\s*\n?\s*}/) // no zone-less render
    })

    it('PolicyCard expiry uses the Athens formatter and correct singular/today', () => {
        const CARD = readFileSync('components/wallet/PolicyCard.tsx', 'utf-8')
        expect(CARD).toContain('formatDate(endDate, locale)')
        expect(CARD).toContain("days === 0") // «σήμερα» / today — not «σε 0 ημέρες»
        expect(CARD).toContain("'σε 1 ημέρα'") // singular — not «σε 1 ημέρες»
    })
})
