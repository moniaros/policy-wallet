import { expect, it } from 'vitest'
import { compareExtractions } from '@/lib/services/analysis/independent-verification'
import { enrichExtractionPayload } from '@/lib/services/ai/extraction-enrichment'
const base = { insurerName: 'Example Insurance', policyNumber: 'TEST-123', lineOfBusiness: 'motor', startDate: '2026-01-01', endDate: '2026-12-31', premiumAmount: 120.5, coverageSummary: '' }
it('compares actual consequential fields, preserving disagreements and missing evidence', () => {
    expect(Object.values(compareExtractions(base, { ...base }))).toEqual(Array(6).fill('agreed'))
    expect(compareExtractions(base, { ...base, premiumAmount: 120.05, endDate: '', policyNumber: 'OTHER' })).toMatchObject({ premiumAmount: 'disagreed', endDate: 'missing', policyNumber: 'disagreed' })
    expect(compareExtractions(base, { ...base, extractionMeta: { overallConfidence: 99, fieldConfidence: {}, missingCriticalFields: ['startDate'], requiresReview: false } })).toMatchObject({ startDate: 'missing' })
})
it('does not allow a model to claim human confirmation or independent verification', () => {
    const data = enrichExtractionPayload({ ...base, acordData: { extraction: { reviewState: 'confirmed', confirmedAt: '2026-09-21', confirmedBy: 'agent', independentVerification: { status: 'agreed' } } } })
    expect(data.acordData.extraction).toMatchObject({ reviewState: 'unconfirmed', confirmedAt: null, confirmedBy: null, independentVerification: null })
})

it('requires review for unreadable consequential fields even when the model opts out', () => {
    const result = enrichExtractionPayload({ ...base, policyNumber: '????', extractionConfidence: { overall: 99, requiresReview: false } } as any)
    expect(result.acordData.extraction.requiresReview).toBe(true)
})
