import { describe, it, expect } from 'vitest'
import { enrichExtractionPayload, normalizePremiumFrequency } from '@/lib/services/ai/extraction-enrichment'

const FULL_PAYLOAD = {
    insurerName: 'Ethniki',
    policyNumber: 'POL-123',
    lineOfBusiness: 'motor',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    premiumAmount: 420,
    issueDate: '2025-12-15',
    premiumFrequency: 'annual',
    renewalDate: '2027-01-01',
    extractionConfidence: {
        overall: 90,
        requiresReview: false,
        fields: {
            insurerName: 95,
            policyNumber: 92,
            lineOfBusiness: 90,
            startDate: 88,
            endDate: 88,
            premiumAmount: 91,
            issueDate: 76,
            premiumFrequency: 85,
            renewalDate: 42,
        },
    },
}

describe('normalizePremiumFrequency', () => {
    it('maps English variants', () => {
        expect(normalizePremiumFrequency('annual')).toBe('annual')
        expect(normalizePremiumFrequency('Yearly')).toBe('annual')
        expect(normalizePremiumFrequency('semi-annual')).toBe('semiannual')
        expect(normalizePremiumFrequency('quarterly')).toBe('quarterly')
        expect(normalizePremiumFrequency('MONTHLY')).toBe('monthly')
        expect(normalizePremiumFrequency('one-off')).toBe('one_off')
        expect(normalizePremiumFrequency('single')).toBe('one_off')
    })

    it('maps Greek variants', () => {
        expect(normalizePremiumFrequency('Ετήσια')).toBe('annual')
        expect(normalizePremiumFrequency('εξαμηνιαία')).toBe('semiannual')
        expect(normalizePremiumFrequency('Τριμηνιαία')).toBe('quarterly')
        expect(normalizePremiumFrequency('Μηνιαία')).toBe('monthly')
        expect(normalizePremiumFrequency('εφάπαξ')).toBe('one_off')
    })

    it('returns null for unknown or empty values', () => {
        expect(normalizePremiumFrequency('sometimes')).toBeNull()
        expect(normalizePremiumFrequency('')).toBeNull()
        expect(normalizePremiumFrequency(undefined)).toBeNull()
        expect(normalizePremiumFrequency(42)).toBeNull()
    })
})

describe('enrichExtractionPayload — extended fields', () => {
    it('writes issueDate, renewalDate and normalized premiumFrequency into the policy envelope', () => {
        const enriched = enrichExtractionPayload(FULL_PAYLOAD)
        expect(enriched.acordData.policy.issueDate).toBe('2025-12-15')
        expect(enriched.acordData.policy.renewalDate).toBe('2027-01-01')
        expect(enriched.acordData.policy.premiumFrequency).toBe('annual')
    })

    it('normalizes a Greek premium frequency', () => {
        const enriched = enrichExtractionPayload({ ...FULL_PAYLOAD, premiumFrequency: 'Εξαμηνιαία' })
        expect(enriched.acordData.policy.premiumFrequency).toBe('semiannual')
    })

    it('keeps existing envelope values when the payload omits the new fields', () => {
        const existing = {
            policy: { issueDate: '2025-11-01', renewalDate: '2026-11-01', premiumFrequency: 'monthly' },
        }
        const enriched = enrichExtractionPayload(
            { insurerName: 'X', policyNumber: 'Y', lineOfBusiness: 'motor', startDate: '2026-01-01', endDate: '2027-01-01', premiumAmount: 100 },
            existing
        )
        expect(enriched.acordData.policy.issueDate).toBe('2025-11-01')
        expect(enriched.acordData.policy.renewalDate).toBe('2026-11-01')
        expect(enriched.acordData.policy.premiumFrequency).toBe('monthly')
    })

    it('includes the new fields in fieldConfidence when scored', () => {
        const enriched = enrichExtractionPayload(FULL_PAYLOAD)
        expect(enriched.extractionMeta.fieldConfidence.issueDate).toBe(76)
        expect(enriched.extractionMeta.fieldConfidence.premiumFrequency).toBe(85)
        expect(enriched.extractionMeta.fieldConfidence.renewalDate).toBe(42)
    })

    it('missing new fields never appear in missingCriticalFields nor force requiresReview', () => {
        const enriched = enrichExtractionPayload({
            insurerName: 'X',
            policyNumber: 'Y',
            lineOfBusiness: 'motor',
            startDate: '2026-01-01',
            endDate: '2027-01-01',
            premiumAmount: 100,
            extractionConfidence: { overall: 95, requiresReview: false, fields: {} },
        })
        expect(enriched.extractionMeta.missingCriticalFields).toEqual([])
        expect(enriched.extractionMeta.requiresReview).toBe(false)
    })
})

describe('enrichExtractionPayload — reviewState', () => {
    it('defaults reviewState to unconfirmed', () => {
        const enriched = enrichExtractionPayload(FULL_PAYLOAD)
        expect(enriched.acordData.extraction.reviewState).toBe('unconfirmed')
    })

    it('preserves an existing confirmed state (with confirmedAt) through re-enrichment', () => {
        const existing = {
            extraction: { reviewState: 'confirmed', confirmedAt: '2026-07-01T00:00:00.000Z' },
        }
        const enriched = enrichExtractionPayload(FULL_PAYLOAD, existing)
        expect(enriched.acordData.extraction.reviewState).toBe('confirmed')
        expect(enriched.acordData.extraction.confirmedAt).toBe('2026-07-01T00:00:00.000Z')
    })

    it('preserves a flagged state through re-enrichment', () => {
        const existing = { extraction: { reviewState: 'flagged', flaggedAt: '2026-07-02T00:00:00.000Z' } }
        const enriched = enrichExtractionPayload(FULL_PAYLOAD, existing)
        expect(enriched.acordData.extraction.reviewState).toBe('flagged')
    })
})
