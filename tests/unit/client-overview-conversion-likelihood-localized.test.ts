import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The client-overview "Identified Gaps" pill shows a conversion score, falling
 * back to the likelihood when there's no numeric score. conversionLikelihood and
 * conversionScore are BOTH independently optional (components/agent/types.ts), so
 * the fallback is reachable — and it rendered the raw "high"/"medium"/"low" enum
 * to Greek agents. The sibling OpportunitiesClient already localises it via
 * t.agentPages.opportunities.likelihood[...]; the overview tab must too.
 */
const SRC = readFileSync('components/agent/tabs/ClientOverviewTab.tsx', 'utf-8')

describe('client overview localises the conversion-likelihood fallback', () => {
    it('does not render the raw conversionLikelihood enum as the pill fallback', () => {
        // The old code ended the ternary with `: opp.conversionLikelihood}` — a
        // bare raw enum render.
        expect(SRC).not.toMatch(/:\s*opp\.conversionLikelihood\s*\}/)
    })

    it('falls back to the shared localised likelihood label', () => {
        expect(SRC).toMatch(/opportunities\.likelihood\[opp\.conversionLikelihood\]/)
    })
})
