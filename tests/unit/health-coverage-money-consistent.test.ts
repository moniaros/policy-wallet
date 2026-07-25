import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * HealthCoverageDetails formatted three amounts (annual limit, room & board,
 * out-of-pocket) through the shared `fmt` (formatCurrency, 0 decimals) but the
 * outpatient limit and per-claim deductible through a RAW toLocaleString with
 * style:"currency" (2 decimals, hardcoded EUR) — so a "1.500,00 €" outpatient
 * limit sat beside a "15.000 €" annual limit: mixed decimals on the same card,
 * and two amounts bypassing the shared formatter. Every money amount on the card
 * must go through the shared formatter for a single, consistent format.
 */
const SRC = readFileSync('components/wallet/coverage-details/HealthCoverageDetails.tsx', 'utf-8')

describe('HealthCoverageDetails formats all money consistently via the shared helper', () => {
    it('no money is formatted with a raw toLocaleString(style:"currency")', () => {
        expect(SRC).not.toMatch(/toLocaleString\([^)]*style:\s*["']currency["']/)
    })

    it('outpatient limit and deductible go through the shared fmt helper', () => {
        expect(SRC).toContain('fmt(health.outpatientLimit)')
        expect(SRC).toContain('fmt(health.deductiblePerClaim)')
    })
})
