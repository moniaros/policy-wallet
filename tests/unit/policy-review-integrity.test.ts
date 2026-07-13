import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureMessage = vi.fn()
vi.mock('@sentry/nextjs', () => ({
    captureMessage: (...args: any[]) => captureMessage(...args),
}))

import { buildPolicyReviewData, sumInsuredLabel } from '@/lib/wallet/policy-review'
import { formatExtractedAmount } from '@/lib/i18n/amount-format'

const PLACEHOLDER_START = new Date('2026-07-13T00:00:00Z')
const PLACEHOLDER_END = new Date('2027-07-13T00:00:00Z')

function makePolicy(acordPolicy: Record<string, unknown>, extraction: Record<string, unknown> = {}) {
    return {
        id: 'p1',
        status: 'active',
        insurerName: 'ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ',
        lineOfBusiness: 'health',
        policyNumber: '1651622',
        startDate: PLACEHOLDER_START,
        endDate: PLACEHOLDER_END,
        premiumAmount: 1000,
        premiumCurrency: 'EUR',
        acordData: { policy: acordPolicy, extraction },
    }
}

beforeEach(() => captureMessage.mockClear())

describe('buildPolicyReviewData — the Ethniki #1651622 chain', () => {
    it('shows the extracted envelope dates, never the placeholder columns', () => {
        const data = buildPolicyReviewData(
            makePolicy({ effectiveDate: '2024-05-22', expirationDate: '2025-05-22', issueDate: '22-05-2024' })
        )
        expect(data.startDate).toBe('2024-05-22')
        expect(data.endDate).toBe('2025-05-22')
        expect(data.issueDate).toBe('22-05-2024')
        expect(data.fieldFlags.startDate.parseFailed).toBe(false)
        expect(data.fieldFlags.issueDate.parseFailed).toBe(false)
    })

    it('flags an unparseable extracted date as parse_failed', () => {
        const data = buildPolicyReviewData(makePolicy({ issueDate: 'κάπου τον Μάιο' }))
        expect(data.fieldFlags.issueDate.parseFailed).toBe(true)
    })

    it('flags a value that contradicts its cited source quote', () => {
        const data = buildPolicyReviewData(
            makePolicy(
                { expirationDate: '2026-05-22' },
                { sources: { endDate: { page: 3, snippet: 'Λήξη Ασφάλισης 22 ΜΑΪΟΥ 2025' } } }
            )
        )
        expect(data.fieldFlags.endDate.parseFailed).toBe(false)
        expect(data.fieldFlags.endDate.sourceMismatch).toBe(true)
    })

    it('accepts a value that AGREES with the quote (dd-MM-yyyy vs Greek month)', () => {
        const data = buildPolicyReviewData(
            makePolicy(
                { expirationDate: '22-05-2025' },
                { sources: { endDate: { page: 3, snippet: 'Λήξη Ασφάλισης 22 ΜΑΪΟΥ 2025' } } }
            )
        )
        expect(data.fieldFlags.endDate.parseFailed).toBe(false)
        expect(data.fieldFlags.endDate.sourceMismatch).toBe(false)
    })

    it('normalizes the insurer display name via the registry', () => {
        const data = buildPolicyReviewData(makePolicy({}))
        expect(data.insurerName).toBe('Εθνική Ασφαλιστική')
    })
})

describe('sumInsuredLabel', () => {
    it('localizes the known acord paths — raw keys never render', () => {
        expect(sumInsuredLabel('health.annualLimit', 'el')).toBe('Ετήσιο όριο κάλυψης υγείας')
        expect(sumInsuredLabel('vehicle.estimatedMarketValue', 'el')).toBe('Εκτιμώμενη αξία οχήματος')
        expect(captureMessage).not.toHaveBeenCalled()
    })

    it('hides unknown paths and reports them to Sentry once', () => {
        expect(sumInsuredLabel('made.up.path', 'el')).toBeNull()
        expect(sumInsuredLabel('made.up.path', 'el')).toBeNull()
        expect(captureMessage).toHaveBeenCalledTimes(1)
    })
})

describe('formatExtractedAmount', () => {
    it.each([
        ['1500000', 'el', '1.500.000 €'],
        ['2000', 'el', '2.000 €'],
        ['0', 'el', '0 €'],
        ['Varies', 'el', 'Μεταβλητό'],
        ['varies', 'en', 'Varies'],
        ['10%', 'el', '10%'],
        ['2 επισκέψεις', 'el', '2 επισκέψεις'],
        ['', 'el', ''],
    ])('%s (%s) → %s', (input, lang, expected) => {
        expect(formatExtractedAmount(input, lang as 'el' | 'en')).toBe(expected)
    })
})
