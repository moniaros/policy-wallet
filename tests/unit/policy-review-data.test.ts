import { describe, it, expect } from 'vitest'
import {
    buildPolicyReviewData,
    confidenceLevel,
    deriveSumInsured,
    sumInsuredTargetPath,
} from '@/lib/wallet/policy-review'

function baseRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'pol-1',
        status: 'active',
        insurerName: 'Ethniki',
        lineOfBusiness: 'motor',
        policyNumber: 'POL-123',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
        premiumAmount: 420.5,
        premiumCurrency: 'EUR',
        coverageSummary: 'Standard motor cover',
        acordData: null as unknown,
        ...overrides,
    }
}

describe('buildPolicyReviewData', () => {
    it('sanitizes extraction placeholders to null', () => {
        const data = buildPolicyReviewData(baseRow({
            insurerName: '__PENDING_EXTRACTION__',
            policyNumber: 'PENDING-1234',
        }))
        expect(data.insurerName).toBeNull()
        expect(data.policyNumber).toBeNull()
    })

    it('converts premium to a plain number and dates to ISO strings', () => {
        const data = buildPolicyReviewData(baseRow())
        expect(data.premiumAmount).toBe(420.5)
        expect(data.startDate).toBe(new Date('2026-01-01').toISOString())
        expect(data.endDate).toBe(new Date('2027-01-01').toISOString())
    })

    it('defaults all list sections to empty arrays and confidence to null when acordData is absent', () => {
        const data = buildPolicyReviewData(baseRow())
        expect(data.coverages).toEqual([])
        expect(data.exclusions).toEqual([])
        expect(data.perksAndBenefits).toEqual([])
        expect(data.notableConditions).toEqual([])
        expect(data.finePrintClauses).toEqual([])
        expect(data.overallConfidence).toBeNull()
        expect(data.fieldConfidence).toEqual({})
        expect(data.reviewState).toBeNull()
        expect(data.verified).toBe(false)
    })

    it('reads envelope fields, lists, confidence and reviewState from acordData', () => {
        const data = buildPolicyReviewData(baseRow({
            acordData: {
                policy: { issueDate: '2025-12-15', renewalDate: '2027-01-01', premiumFrequency: 'annual' },
                coverages: [{ name: 'Liability', limit: '€1m' }, { noName: true }],
                exclusions: ['Racing', '  ', 'Off-road'],
                extraction: {
                    reviewState: 'unconfirmed',
                    requiresReview: false,
                    confidence: { overall: 88, fields: { insurerName: 95, renewalDate: 42 } },
                    missingCriticalFields: [],
                },
            },
        }))
        expect(data.issueDate).toBe('2025-12-15')
        expect(data.renewalDate).toBe('2027-01-01')
        expect(data.premiumFrequency).toBe('annual')
        expect(data.coverages).toHaveLength(1)
        expect(data.exclusions).toEqual(['Racing', 'Off-road'])
        expect(data.overallConfidence).toBe(88)
        expect(data.fieldConfidence.renewalDate).toBe(42)
        expect(data.reviewState).toBe('unconfirmed')
        expect(data.verified).toBe(true)
    })

    it('treats unknown reviewState values as null (pre-feature policies)', () => {
        const data = buildPolicyReviewData(baseRow({
            acordData: { extraction: { reviewState: 'weird' } },
        }))
        expect(data.reviewState).toBeNull()
    })
})

describe('deriveSumInsured / sumInsuredTargetPath', () => {
    it('resolves the canonical section per line of business', () => {
        expect(sumInsuredTargetPath('home')).toEqual(['property', 'insuredValue'])
        expect(sumInsuredTargetPath('health')).toEqual(['health', 'annualLimit'])
        expect(sumInsuredTargetPath('life')).toEqual(['lifeAndInvestment', 'deathBenefit'])
        expect(sumInsuredTargetPath('motor')).toEqual(['vehicle', 'estimatedMarketValue'])
        expect(sumInsuredTargetPath('pet')).toEqual(['pet', 'annualLimit'])
        expect(sumInsuredTargetPath('travel')).toEqual(['policy', 'sumInsured'])
    })

    it('reads canonical values', () => {
        expect(deriveSumInsured('home', { property: { insuredValue: 250000 } }))
            .toEqual({ value: 250000, label: 'property.insuredValue' })
        expect(deriveSumInsured('motor', { vehicle: { estimatedMarketValue: 12000 } }))
            .toEqual({ value: 12000, label: 'vehicle.estimatedMarketValue' })
    })

    it('falls back to legacy aliases', () => {
        expect(deriveSumInsured('home', { home: { insuredValue: 180000 } }))
            .toEqual({ value: 180000, label: 'home.insuredValue' })
        expect(deriveSumInsured('pet', { pet: { annualLimitTotal: 3000 } }))
            .toEqual({ value: 3000, label: 'pet.annualLimitTotal' })
    })

    it('returns null when nothing is present', () => {
        expect(deriveSumInsured('health', {})).toBeNull()
        expect(deriveSumInsured('health', null)).toBeNull()
    })
})

describe('confidenceLevel', () => {
    it('uses the 80/50 boundaries', () => {
        expect(confidenceLevel(100)).toBe('high')
        expect(confidenceLevel(80)).toBe('high')
        expect(confidenceLevel(79.9)).toBe('medium')
        expect(confidenceLevel(50)).toBe('medium')
        expect(confidenceLevel(49.9)).toBe('low')
        expect(confidenceLevel(0)).toBe('low')
        expect(confidenceLevel(undefined)).toBe('unknown')
        expect(confidenceLevel(null)).toBe('unknown')
    })
})
