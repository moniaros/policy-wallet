import { describe, it, expect } from 'vitest'
import { analyzePortfolioGaps, calculateCoverageScore, GREEK_COVERAGE_MATRIX } from '@/lib/services/cross-sell.service'
import { branchFamilyId } from '@/lib/insurance/taxonomy'

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

/**
 * The emitter-side invariant that makes the fix hold: the coverage matrix must
 * list only PARENT branches. Cross-sell normalises the customer's lines to their
 * family (motorbike → motor) and matches against the matrix; if the matrix ever
 * carried a CHILD branch (e.g. 'motorbike'), a customer's normalised 'motor'
 * would not match it and the pitch would return, silently, from the other side.
 * A parent branch is its own family, so this pins that.
 */
describe('the coverage matrix lists only parent branches', () => {
    it('every matrix line is a family root', () => {
        const offenders = GREEK_COVERAGE_MATRIX
            .map((l) => l.lob)
            .filter((lob) => branchFamilyId(lob) !== lob)
        expect(
            offenders,
            `these matrix lobs are CHILD branches; use their parent so family matching works:\n  ${offenders.join('\n  ')}`,
        ).toEqual([])
    })
})
