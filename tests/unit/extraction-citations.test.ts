import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    CITATION_FIELDS,
    extractionCitationsEnabled,
    sanitizeExtractionSources,
} from '@/lib/services/ai/extraction-citations'
import { enrichExtractionPayload } from '@/lib/services/ai/extraction-enrichment'
import { buildPolicyReviewData } from '@/lib/wallet/policy-review'

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('extraction citations — flag', () => {
    it('is OFF by default and ON only with EXTRACTION_CITATIONS=1', () => {
        vi.stubEnv('EXTRACTION_CITATIONS', '')
        expect(extractionCitationsEnabled()).toBe(false)
        vi.stubEnv('EXTRACTION_CITATIONS', '1')
        expect(extractionCitationsEnabled()).toBe(true)
        vi.stubEnv('EXTRACTION_CITATIONS', 'true')
        expect(extractionCitationsEnabled()).toBe(false)
    })
})

describe('extraction citations — sanitizeExtractionSources', () => {
    it('keeps only known citation fields', () => {
        const result = sanitizeExtractionSources({
            insurerName: { page: 1, snippet: 'Interamerican ΑΕ' },
            hallucinatedField: { page: 2, snippet: 'junk' },
        })
        expect(result).toEqual({ insurerName: { page: 1, snippet: 'Interamerican ΑΕ' } })
    })

    it('clamps snippets to 240 chars and drops invalid pages', () => {
        const result = sanitizeExtractionSources({
            endDate: { page: -3, snippet: 'α'.repeat(500) },
            premiumAmount: { page: 2.7, snippet: '  ' },
        })
        expect(result?.endDate.page).toBeUndefined()
        expect(result?.endDate.snippet).toHaveLength(240)
        expect(result?.premiumAmount).toBeUndefined()
    })

    it('returns null for empty, non-object or arrays', () => {
        expect(sanitizeExtractionSources(null)).toBeNull()
        expect(sanitizeExtractionSources('text')).toBeNull()
        expect(sanitizeExtractionSources([])).toBeNull()
        expect(sanitizeExtractionSources({ policyNumber: {} })).toBeNull()
    })

    it('citation fields mirror the confidence field set', () => {
        expect([...CITATION_FIELDS]).toEqual([
            'insurerName', 'policyNumber', 'lineOfBusiness', 'startDate', 'endDate',
            'premiumAmount', 'issueDate', 'premiumFrequency', 'renewalDate',
        ])
    })
})

describe('extraction citations — enrichment persistence', () => {
    const basePayload = {
        insurerName: 'Ethniki',
        policyNumber: 'ETH-1',
        lineOfBusiness: 'health',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        premiumAmount: 800,
    }

    it('stores sanitized sources under acordData.extraction.sources', () => {
        const enriched = enrichExtractionPayload({
            ...basePayload,
            extractionSources: {
                endDate: { page: 3, snippet: 'Λήξη: 01/01/2027' },
                bogus: { page: 1, snippet: 'x' },
            },
        })
        expect(enriched.acordData.extraction.sources).toEqual({
            endDate: { page: 3, snippet: 'Λήξη: 01/01/2027' },
        })
    })

    it('omits the sources key entirely when no citations were returned', () => {
        const enriched = enrichExtractionPayload(basePayload)
        expect('sources' in enriched.acordData.extraction).toBe(false)
    })

    it('preserves previous sources when a re-analysis returns none', () => {
        const existing = {
            extraction: { sources: { insurerName: { page: 1, snippet: 'Εθνική Ασφαλιστική' } } },
        }
        const enriched = enrichExtractionPayload(basePayload, existing)
        expect(enriched.acordData.extraction.sources).toEqual({
            insurerName: { page: 1, snippet: 'Εθνική Ασφαλιστική' },
        })
    })

    it('replaces previous sources when a fresh extraction cites anew', () => {
        const existing = {
            extraction: { sources: { insurerName: { page: 1, snippet: 'old' } } },
        }
        const enriched = enrichExtractionPayload(
            { ...basePayload, extractionSources: { endDate: { page: 2, snippet: 'new' } } },
            existing
        )
        expect(enriched.acordData.extraction.sources).toEqual({ endDate: { page: 2, snippet: 'new' } })
    })
})

describe('extraction citations — review read model', () => {
    const policyRow = {
        id: 'p1',
        status: 'active',
        insurerName: 'Ethniki',
        lineOfBusiness: 'health',
        policyNumber: 'ETH-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
        premiumAmount: 800,
        premiumCurrency: 'EUR',
        coverageSummary: null,
        acordData: {
            extraction: {
                confidence: { overall: 90, fields: { insurerName: 95 } },
                sources: { insurerName: { page: 1, snippet: 'Εθνική Ασφαλιστική ΑΕΕΓΑ' } },
                requiresReview: false,
            },
        },
    }

    it('exposes fieldSources from acordData.extraction.sources', () => {
        const data = buildPolicyReviewData(policyRow as never)
        expect(data.fieldSources.insurerName).toEqual({ page: 1, snippet: 'Εθνική Ασφαλιστική ΑΕΕΓΑ' })
    })

    it('yields an empty map when no sources exist', () => {
        const withoutSources = {
            ...policyRow,
            acordData: { extraction: { confidence: { overall: 90, fields: {} }, requiresReview: false } },
        }
        const data = buildPolicyReviewData(withoutSources as never)
        expect(data.fieldSources).toEqual({})
    })
})
