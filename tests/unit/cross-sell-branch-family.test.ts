import { describe, it, expect } from 'vitest'
import { analyzePortfolioGaps, calculateCoverageScore } from '@/lib/services/cross-sell.service'

/**
 * The Greek coverage matrix lists PARENT branches (motor, home, life). A
 * customer's policy may be a CHILD branch — motorbike, truck (→ motor), renters
 * (→ home), income_protection / disability / personal_accident (→ life). The
 * cross-sell matched raw lines, so a motorbike owner was flagged as missing
 * MOTOR — an essential line — and the agent was prompted to pitch coverage the
 * customer already holds. Nothing erodes an agent's trust in a tool faster.
 */
describe('cross-sell matches on branch family, not the raw line', () => {
    const missingLobs = (existing: string[]) => analyzePortfolioGaps(existing).map((l) => l.lob)

    it('does not flag motor as missing for a motorbike owner', () => {
        expect(missingLobs(['motorbike'])).not.toContain('motor')
    })

    it('does not flag motor as missing for a truck owner', () => {
        expect(missingLobs(['truck'])).not.toContain('motor')
    })

    it('does not flag home as missing for a renters policy', () => {
        expect(missingLobs(['renters'])).not.toContain('home')
    })

    it('does not flag life as missing for an income-protection holder', () => {
        expect(missingLobs(['income_protection'])).not.toContain('life')
    })

    it('still flags a genuinely absent line', () => {
        // A motorbike owner with nothing else IS missing home and health.
        const missing = missingLobs(['motorbike'])
        expect(missing).toContain('home')
        expect(missing).toContain('health')
    })

    it('the coverage score credits a child-branch policy to its family', () => {
        // motorbike + renters + income_protection covers motor + home + life.
        // Raw matching scored these as zero cover; family matching credits them.
        const raw = calculateCoverageScore(['other-nonsense'])
        const family = calculateCoverageScore(['motorbike', 'renters', 'income_protection', 'health'])
        expect(family).toBeGreaterThan(raw)
        // motor + home + health (all essential) + life (optional) covered.
        expect(family).toBeGreaterThanOrEqual(70)
    })
})
