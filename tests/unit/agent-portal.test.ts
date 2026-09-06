import { describe, it, expect } from 'vitest'
import {
    computePortfolioCompleteness,
    deriveConsentStatus,
    deriveRecommendedAction,
    type RecommendedActionFacts,
} from '@/lib/services/agent-portal.service'
import { AGENT_ATTESTED_CONSENT_PREFIX } from '@/lib/ai-consent'

const NOW = new Date('2026-07-10T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function facts(overrides: Partial<RecommendedActionFacts> = {}): RecommendedActionFacts {
    return {
        activationStatus: 'activated',
        relationshipCreatedAt: new Date(NOW.getTime() - 100 * DAY),
        activePolicyCount: 2,
        consentStatus: 'granted',
        nextRenewalDate: new Date(NOW.getTime() + 200 * DAY),
        gapCount: 0,
        criticalGapCount: 0,
        lastInteractionAt: new Date(NOW.getTime() - 5 * DAY),
        now: NOW,
        ...overrides,
    }
}

describe('deriveConsentStatus', () => {
    it('maps version presence and attestation sentinel', () => {
        expect(deriveConsentStatus(null)).toBe('none')
        expect(deriveConsentStatus(undefined)).toBe('none')
        expect(deriveConsentStatus('')).toBe('none')
        expect(deriveConsentStatus('v2')).toBe('granted')
        expect(deriveConsentStatus(`${AGENT_ATTESTED_CONSENT_PREFIX}agent-123`)).toBe('attested')
    })
})

describe('deriveRecommendedAction — priority order', () => {
    it('healthy client → all_good', () => {
        expect(deriveRecommendedAction(facts())).toBe('all_good')
    })

    it('stale invite outranks everything', () => {
        expect(
            deriveRecommendedAction(
                facts({
                    activationStatus: 'invited',
                    relationshipCreatedAt: new Date(NOW.getTime() - 10 * DAY),
                    activePolicyCount: 0,
                    consentStatus: 'none',
                })
            )
        ).toBe('resend_invite')
    })

    it('fresh invite does not nag — falls through to next applicable action', () => {
        expect(
            deriveRecommendedAction(
                facts({
                    activationStatus: 'invited',
                    relationshipCreatedAt: new Date(NOW.getTime() - 2 * DAY),
                    activePolicyCount: 0,
                })
            )
        ).toBe('add_first_policy')
    })

    it('no active policies → add_first_policy', () => {
        expect(deriveRecommendedAction(facts({ activePolicyCount: 0 }))).toBe('add_first_policy')
    })

    it('missing consent with policies → request_consent', () => {
        expect(deriveRecommendedAction(facts({ consentStatus: 'none' }))).toBe('request_consent')
    })

    it('attested consent counts as consent (no request nag)', () => {
        expect(deriveRecommendedAction(facts({ consentStatus: 'attested' }))).toBe('all_good')
    })

    it('renewal within 30 days → review_renewal, and outranks gaps', () => {
        expect(
            deriveRecommendedAction(
                facts({
                    nextRenewalDate: new Date(NOW.getTime() + 10 * DAY),
                    gapCount: 5,
                    criticalGapCount: 3,
                })
            )
        ).toBe('review_renewal')
    })

    it('critical gap or ≥2 gaps → discuss_gaps', () => {
        expect(deriveRecommendedAction(facts({ criticalGapCount: 1, gapCount: 1 }))).toBe('discuss_gaps')
        expect(deriveRecommendedAction(facts({ gapCount: 2 }))).toBe('discuss_gaps')
        expect(deriveRecommendedAction(facts({ gapCount: 1 }))).toBe('all_good')
    })

    it('stale relationship → check_in', () => {
        expect(
            deriveRecommendedAction(facts({ lastInteractionAt: new Date(NOW.getTime() - 90 * DAY) }))
        ).toBe('check_in')
        expect(deriveRecommendedAction(facts({ lastInteractionAt: null }))).toBe('check_in')
    })
})

describe('computePortfolioCompleteness', () => {
    it('averages and rounds scores', () => {
        expect(computePortfolioCompleteness([80, 60, 70])).toBe(70)
        expect(computePortfolioCompleteness([33, 34])).toBe(34)
    })

    it('returns null when no client is scored', () => {
        expect(computePortfolioCompleteness([])).toBeNull()
    })
})
