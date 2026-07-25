import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The policy-detail page renders exclusions in TWO places: the Coverage
 * breakdown's "Not Covered" tab (CoverageTabView) and the dedicated Exclusions
 * section (ExclusionsCard). ExclusionsCard's documented principle is that
 * "standard exclusions are facts of the contract, not alarms" — neutral styling.
 * CoverageTabView contradicted it by framing the same exclusions in alarming red
 * (red bg/border/text + a red ✗ XCircle), making standard, universal exclusions
 * (war, wear-and-tear, …) look like dangers. The two must agree: exclusions are
 * neutral, not alarms.
 */
const SRC = readFileSync('components/wallet/coverage-details/CoverageTabView.tsx', 'utf-8')

function exclusionsBlock(): string {
    const start = SRC.indexOf('acordData.exclusions!.map')
    expect(start, 'exclusions map not found').toBeGreaterThan(-1)
    // The row markup is within ~600 chars of the map opener.
    return SRC.slice(start, start + 600)
}

describe('CoverageTabView frames exclusions neutrally, not as red alarms', () => {
    it('the exclusion rows use no alarming red palette', () => {
        const block = exclusionsBlock()
        expect(block, 'exclusion rows still use red background').not.toMatch(/bg-red-/)
        expect(block, 'exclusion text is still red').not.toMatch(/text-red-/)
        expect(block, 'exclusion border is still red').not.toMatch(/border-red-/)
    })

    it('uses the neutral MinusCircle (excluded), not a red XCircle', () => {
        const block = exclusionsBlock()
        expect(block).toContain('MinusCircle')
        expect(SRC).not.toContain('XCircle')
    })
})
