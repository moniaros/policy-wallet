import { describe, it, expect } from 'vitest'
import {
    resolveCoverageEndDate,
    isCoveredByEndDate,
    isPolicyCoverageActive,
    coveredPolicyWhere,
} from '@/lib/policy-status'

const now = new Date('2026-07-16T00:00:00Z')
const future = new Date('2027-01-01T00:00:00Z')
const past = new Date('2025-01-01T00:00:00Z')

// A policy whose real expiry lives in the extracted envelope, as the engine sees it.
const withEnvelope = (expiration: string | null, status = 'active') => ({
    status,
    policyNumber: 'POL-1',
    insurerName: 'Ethniki',
    endDate: new Date('2099-01-01'), // placeholder column — must be ignored
    acordData: expiration ? { policy: { expirationDate: expiration } } : {},
})

describe('resolveCoverageEndDate', () => {
    it('returns the envelope expiry (not the placeholder column)', () => {
        expect(resolveCoverageEndDate(withEnvelope('01-01-2027'))?.getFullYear()).toBe(2027)
    })
    it('is null when the expiry is unreadable/absent (unknown duration)', () => {
        expect(resolveCoverageEndDate(withEnvelope('not a date'))).toBeNull()
        expect(resolveCoverageEndDate(withEnvelope(null))).not.toBeNull() // falls back to column
    })
})

describe('isCoveredByEndDate mirrors isPolicyCoverageActive', () => {
    const cases = [
        { name: 'active future expiry', policy: withEnvelope('01-01-2027') },
        { name: 'expired', policy: withEnvelope('01-01-2025') },
        { name: 'unknown duration (unparseable)', policy: withEnvelope('garbage') },
        { name: 'cancelled', policy: withEnvelope('01-01-2027', 'cancelled') },
        { name: 'analyzing', policy: withEnvelope('01-01-2027', 'analyzing') },
    ]
    for (const c of cases) {
        it(c.name, () => {
            const denorm = { status: c.policy.status, coverageEndDate: resolveCoverageEndDate(c.policy) }
            // Both default to real "now"; the case dates are far from any boundary.
            expect(isCoveredByEndDate(denorm)).toBe(isPolicyCoverageActive(c.policy))
        })
    }
})

describe('isCoveredByEndDate — direct semantics', () => {
    it('null coverageEndDate counts as coverage (unknown duration)', () => {
        expect(isCoveredByEndDate({ status: 'active', coverageEndDate: null }, now)).toBe(true)
    })
    it('future date covers, past date does not', () => {
        expect(isCoveredByEndDate({ status: 'active', coverageEndDate: future }, now)).toBe(true)
        expect(isCoveredByEndDate({ status: 'active', coverageEndDate: past }, now)).toBe(false)
    })
    it('analyzing/cancelled are never covered regardless of date', () => {
        expect(isCoveredByEndDate({ status: 'analyzing', coverageEndDate: future }, now)).toBe(false)
        expect(isCoveredByEndDate({ status: 'cancelled', coverageEndDate: future }, now)).toBe(false)
    })
})

describe('coveredPolicyWhere', () => {
    it('excludes analyzing/cancelled/deleted and requires null-or-future coverageEndDate', () => {
        const w = coveredPolicyWhere(now)
        expect(w.status).toEqual({ notIn: ['analyzing', 'cancelled', 'deleted'] })
        expect(w.OR).toEqual([{ coverageEndDate: null }, { coverageEndDate: { gte: now } }])
    })
})
