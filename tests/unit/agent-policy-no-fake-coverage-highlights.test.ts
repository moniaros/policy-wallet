import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The agent's per-customer policy detail page rendered a generic "Coverage
 * Highlights" block that showed the SAME two static items — with green
 * checkmarks — for every policy, regardless of what it actually covers:
 *   • "Standard Coverage · Full protection based on policy specifications"
 *   • "Direct Support · 24/7 assistance via insurer"
 * Neither was extracted from the policy; the 24/7-assistance line asserted cover
 * that many policies do not have — a fabricated coverage claim presented as fact
 * to the advisor. The real, policy-specific coverage (summary + AI-extracted
 * structured coverages + gap analysis) is shown below, so the filler was removed.
 */
const SRC = readFileSync(
    'app/(protected)/customers/[id]/policy/[policyId]/page.tsx',
    'utf-8',
)

describe('agent policy detail does not render fabricated coverage highlights', () => {
    it('does not render the generic Standard Coverage / Direct Support filler', () => {
        expect(SRC).not.toMatch(/\{pd\.standardCoverage\b/)
        expect(SRC).not.toMatch(/\{pd\.standardCoverageDesc\b/)
        expect(SRC).not.toMatch(/\{pd\.directSupport\b/)
        expect(SRC).not.toMatch(/\{pd\.directSupportDesc\b/)
    })

    it('does not render a static coverage-highlights heading with green checks', () => {
        expect(SRC).not.toMatch(/\{pd\.coverageHighlights\}/)
    })
})
