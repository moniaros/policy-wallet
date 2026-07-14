import { describe, expect, it } from 'vitest'

import {
    coverageEngineStatus,
    effectivePolicyStatus,
    isPolicyCoverageActive,
} from '@/lib/policy-status'
import { detectProfileGaps, toProfileFields } from '@/lib/services/gap-engine/profile-gap-rules'
import { buildBranchOverview } from '@/lib/insurance/branch-page'

const PLACEHOLDER_END = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
const FUTURE = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000)
const SOON = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

/** The real prod policy: health, lapsed May 2025, stored status still 'active'. */
const EXPIRED_HEALTH = {
    id: 'health-1',
    lineOfBusiness: 'health',
    status: 'active', // stale stored string — never recomputed
    policyNumber: '1651622',
    insurerName: 'ΕΘΝΙΚΗ',
    endDate: new Date('2025-05-22T00:00:00Z'),
    acordData: { policy: { expirationDate: '22-05-2025' } },
}

const ACTIVE_MOTOR = {
    id: 'motor-1',
    lineOfBusiness: 'motor',
    status: 'active',
    policyNumber: '00100177912',
    insurerName: 'ΕΘΝΙΚΗ',
    endDate: FUTURE,
    acordData: { policy: { expirationDate: FUTURE.toISOString().slice(0, 10) } },
}

describe('isPolicyCoverageActive — the coverage question', () => {
    it('an expired policy is NOT coverage, however "active" the stored status says', () => {
        expect(isPolicyCoverageActive(EXPIRED_HEALTH)).toBe(false)
        expect(coverageEngineStatus(EXPIRED_HEALTH)).toBe('expired')
        expect(effectivePolicyStatus(EXPIRED_HEALTH)).toBe('expired')
    })

    it('is not fooled by the upload-day placeholder column when the envelope says expired', () => {
        expect(
            isPolicyCoverageActive({ ...EXPIRED_HEALTH, endDate: PLACEHOLDER_END })
        ).toBe(false)
    })

    it('an expiring-soon policy still protects you today', () => {
        const expiringSoon = { ...ACTIVE_MOTOR, endDate: SOON, acordData: null }
        expect(isPolicyCoverageActive(expiringSoon)).toBe(true)
        expect(coverageEngineStatus(expiringSoon)).toBe('active')
        expect(effectivePolicyStatus(expiringSoon)).toBe('expiring_soon')
    })

    it('analyzing and cancelled policies are not coverage', () => {
        expect(isPolicyCoverageActive({ ...ACTIVE_MOTOR, status: 'analyzing' })).toBe(false)
        expect(isPolicyCoverageActive({ ...ACTIVE_MOTOR, status: 'cancelled' })).toBe(false)
    })

    it('an unreadable expiry counts as coverage (we never invent an expiry we cannot read)', () => {
        const unknown = { ...ACTIVE_MOTOR, acordData: { policy: { expirationDate: 'κάποτε' } } }
        expect(isPolicyCoverageActive(unknown)).toBe(true)
        expect(effectivePolicyStatus(unknown)).toBe('unknown_duration')
    })
})

describe('profile gap rules through the coverage lens (the reported bug)', () => {
    const profile = toProfileFields({
        dependentsCount: 2,
        vehiclesCount: 1,
        ownsHome: false,
        maritalStatus: 'married',
    } as any)

    it('FIRES no_health when the only health policy has lapsed', () => {
        const gaps = detectProfileGaps(profile, [
            { lineOfBusiness: 'health', status: coverageEngineStatus(EXPIRED_HEALTH) },
            { lineOfBusiness: 'motor', status: coverageEngineStatus(ACTIVE_MOTOR) },
        ])
        expect(gaps.map((g) => g.ruleId)).toContain('no_health')
    })

    it('does NOT fire no_health while the health policy is still in force', () => {
        const liveHealth = { ...EXPIRED_HEALTH, endDate: FUTURE, acordData: { policy: { expirationDate: FUTURE.toISOString().slice(0, 10) } } }
        const gaps = detectProfileGaps(profile, [
            { lineOfBusiness: 'health', status: coverageEngineStatus(liveHealth) },
        ])
        expect(gaps.map((g) => g.ruleId)).not.toContain('no_health')
    })

    it('FIRES vehicles_no_motor when the motor policy has lapsed (legally mandatory cover)', () => {
        const expiredMotor = { ...ACTIVE_MOTOR, endDate: new Date('2025-01-01'), acordData: { policy: { expirationDate: '01-01-2025' } } }
        const gaps = detectProfileGaps(profile, [
            { lineOfBusiness: 'motor', status: coverageEngineStatus(expiredMotor) },
        ])
        expect(gaps.map((g) => g.ruleId)).toContain('vehicles_no_motor')
    })
})

describe('branch coverage map', () => {
    it('never paints a lapsed branch as covered — it shows attention', () => {
        const overview = buildBranchOverview(
            [
                {
                    id: EXPIRED_HEALTH.id,
                    lineOfBusiness: 'health',
                    status: effectivePolicyStatus(EXPIRED_HEALTH),
                    endDate: EXPIRED_HEALTH.endDate,
                },
                {
                    id: ACTIVE_MOTOR.id,
                    lineOfBusiness: 'motor',
                    status: effectivePolicyStatus(ACTIVE_MOTOR),
                    endDate: ACTIVE_MOTOR.endDate,
                },
            ],
            ['health', 'motor']
        )
        const health = overview.find((entry) => entry.branch.id === 'health')
        const motor = overview.find((entry) => entry.branch.id === 'motor')

        expect(health?.state).toBe('attention')
        expect(health?.state).not.toBe('covered')
        expect(health?.activeCount).toBe(0)
        expect(motor?.state).toBe('covered')
    })
})
