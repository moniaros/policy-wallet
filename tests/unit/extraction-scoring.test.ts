import { describe, it, expect } from 'vitest'
import {
    normalizeForCompare,
    scoreExtraction,
    type ExtractionExpected,
    type ExtractionActual,
} from '@/lib/eval/extraction-scoring'

describe('normalizeForCompare', () => {
    it('lowercases, strips Greek accents, collapses whitespace', () => {
        expect(normalizeForCompare('  Εθνική   Ασφαλιστική ')).toBe('εθνικη ασφαλιστικη')
        expect(normalizeForCompare('ΜΑΪΟΥ')).toBe('μαιου')
    })
    it('is empty for nullish input', () => {
        expect(normalizeForCompare(undefined)).toBe('')
        expect(normalizeForCompare(null)).toBe('')
    })
})

describe('scoreExtraction', () => {
    const expected: ExtractionExpected = {
        insurerName: 'Εθνική Ασφαλιστική',
        policyNumber: '1651622',
        lineOfBusiness: 'motor',
        startDate: '2024-05-22',
        endDate: '2025-05-22',
        premiumAmount: 452.3,
        premiumFrequency: 'annual',
        minExclusions: 2,
        minFinePrintClauses: 1,
    }

    it('scores a perfect extraction 100%', () => {
        const actual: ExtractionActual = {
            insurerName: 'ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ Α.Ε.', // superset — accent/case/suffix tolerant
            policyNumber: '1651622',
            lineOfBusiness: 'motor',
            startDate: '2024-05-22T00:00:00.000Z', // ISO datetime — compared by day
            endDate: '2025-05-22',
            premiumAmount: 452.3,
            premiumFrequency: 'annual',
            exclusions: ['a', 'b', 'c'],
            acordData: { finePrintClauses: [{}, {}] },
        }
        const score = scoreExtraction(expected, actual)
        expect(score.total).toBe(9)
        expect(score.passed).toBe(9)
        expect(score.accuracyPct).toBe(100)
    })

    it('flags a wrong lineOfBusiness, a bad date, and too few exclusions', () => {
        const actual: ExtractionActual = {
            insurerName: 'Εθνική Ασφαλιστική',
            policyNumber: '1651622',
            lineOfBusiness: 'home', // wrong
            startDate: '2024-05-21', // off by a day
            endDate: '2025-05-22',
            premiumAmount: 452.3,
            premiumFrequency: 'annual',
            exclusions: ['only one'], // below min 2
            acordData: { finePrintClauses: [{}] },
        }
        const score = scoreExtraction(expected, actual)
        const failed = score.fields.filter((f) => !f.passed).map((f) => f.field).sort()
        expect(failed).toEqual(['exclusions', 'lineOfBusiness', 'startDate'])
        expect(score.accuracyPct).toBe(67) // 6/9
    })

    it('only scores labeled fields', () => {
        const score = scoreExtraction({ lineOfBusiness: 'health' }, { lineOfBusiness: 'health' })
        expect(score.total).toBe(1)
        expect(score.accuracyPct).toBe(100)
    })

    it('a missing premium counts as a miss, not a crash', () => {
        const score = scoreExtraction({ premiumAmount: 100 }, {})
        expect(score.passed).toBe(0)
        expect(score.accuracyPct).toBe(0)
    })
})
