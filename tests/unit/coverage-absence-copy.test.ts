import { describe, it, expect } from 'vitest'
import {
    resolveCoverageAbsence,
    resolveCoverageAbsenceCopy,
    type CoverageAbsenceCopy,
} from '@/lib/wallet/policy-detail'

/**
 * The coverage-absence card explains why there is no coverage to show and points
 * the reader at the right next step. A `blocked` run — deep AI analysis gated
 * behind Plus, or missing owner consent — used to be lumped into `failed`, telling
 * the reader the analysis broke and to re-analyse or upload a clearer copy: wrong
 * three ways (it did not fail, retrying reproduces the block, the document is fine).
 *
 * These pin the mapping the card actually renders. Sentinel copy strings make an
 * accidental collapse of one state into another's copy fail loudly.
 */

// Distinct sentinels so any mis-mapping surfaces as the wrong string, not a match.
const COPY: CoverageAbsenceCopy = {
    analysisNeverRun: 'NEVER_TITLE',
    analysisNeverRunHint: 'NEVER_HINT',
    analysisFailedTitle: 'FAILED_TITLE',
    analysisFailedHint: 'FAILED_HINT',
    analysisBlockedConsentTitle: 'CONSENT_TITLE',
    analysisBlockedConsentHint: 'CONSENT_HINT',
    analysisBlockedUpgradeTitle: 'UPGRADE_TITLE',
    analysisBlockedUpgradeHint: 'UPGRADE_HINT',
    analysisDegradedTitle: 'DEGRADED_TITLE',
    analysisDegradedHint: 'DEGRADED_HINT',
    analysisFoundNothingTitle: 'EMPTY_TITLE',
    analysisFoundNothingHint: 'EMPTY_HINT',
}

const FAILED_STRINGS = [COPY.analysisFailedTitle, COPY.analysisFailedHint]

describe('resolveCoverageAbsence — run status → absence reason', () => {
    it('maps each analysis-run status to its own reason', () => {
        expect(resolveCoverageAbsence(undefined)).toBe('never')
        expect(resolveCoverageAbsence(null)).toBe('never')
        expect(resolveCoverageAbsence('queued')).toBe('never')
        expect(resolveCoverageAbsence('running')).toBe('never')
        expect(resolveCoverageAbsence('blocked')).toBe('blocked')
        expect(resolveCoverageAbsence('failed')).toBe('failed')
        expect(resolveCoverageAbsence('completed_with_warnings')).toBe('degraded')
        expect(resolveCoverageAbsence('completed')).toBe('empty')
    })

    it('a blocked run is NOT a failed run', () => {
        // The regression this whole change exists to prevent.
        expect(resolveCoverageAbsence('blocked')).not.toBe('failed')
    })
})

describe('resolveCoverageAbsenceCopy — the strings the card renders', () => {
    it('a blocked/consent run shows the consent copy, never the failed/retry copy', () => {
        const { absence, title, hint } = resolveCoverageAbsenceCopy('blocked', 'ai_consent_missing', COPY)
        expect(absence).toBe('blocked')
        expect(title).toBe('CONSENT_TITLE')
        expect(hint).toBe('CONSENT_HINT')
        expect(FAILED_STRINGS).not.toContain(title)
        expect(FAILED_STRINGS).not.toContain(hint)
    })

    it('a blocked/paywall run shows the upgrade copy, never the failed/retry copy', () => {
        const { title, hint } = resolveCoverageAbsenceCopy('blocked', 'free_tier_ai_locked', COPY)
        expect(title).toBe('UPGRADE_TITLE')
        expect(hint).toBe('UPGRADE_HINT')
        expect(FAILED_STRINGS).not.toContain(title)
        expect(FAILED_STRINGS).not.toContain(hint)
    })

    it('a blocked run with no/unknown reason defaults to upgrade, not consent', () => {
        // Consent is the narrower claim (someone must act on the owner's behalf);
        // only assert it when the reason actually says so.
        expect(resolveCoverageAbsenceCopy('blocked', null, COPY).title).toBe('UPGRADE_TITLE')
        expect(resolveCoverageAbsenceCopy('blocked', 'something_else', COPY).title).toBe('UPGRADE_TITLE')
    })

    it('a genuinely failed run still shows the failed copy', () => {
        const { title, hint } = resolveCoverageAbsenceCopy('failed', null, COPY)
        expect(title).toBe('FAILED_TITLE')
        expect(hint).toBe('FAILED_HINT')
    })

    it('degraded and empty stay distinct (a warnings run is not a clean-empty one)', () => {
        expect(resolveCoverageAbsenceCopy('completed_with_warnings', null, COPY).title).toBe('DEGRADED_TITLE')
        expect(resolveCoverageAbsenceCopy('completed', null, COPY).title).toBe('EMPTY_TITLE')
        expect(resolveCoverageAbsenceCopy('completed_with_warnings', null, COPY).title).not.toBe(
            resolveCoverageAbsenceCopy('completed', null, COPY).title,
        )
    })

    it('no run yet shows the never-run copy', () => {
        const { title, hint } = resolveCoverageAbsenceCopy(undefined, undefined, COPY)
        expect(title).toBe('NEVER_TITLE')
        expect(hint).toBe('NEVER_HINT')
    })
})
