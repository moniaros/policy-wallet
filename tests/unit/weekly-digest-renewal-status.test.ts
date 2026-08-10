import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The weekly digest's renewal list filtered `status: "active"`. Policy.status is
 * an ingestion state that nothing recomputes — 'expiring_soon' and 'action_needed'
 * are in-force (IN_FORCE_KEYS), and 'incomplete' is a real uploaded policy pending
 * review. So a policy literally marked "expiring_soon" was dropped from the
 * expiring-soon email. This captures the actual Prisma where-clause the job builds
 * and asserts it includes those states and excludes only the non-policy ones.
 */
const policyFindMany = vi.fn(async (..._a: any[]) => [] as any[])
const userFindMany = vi.fn(async (..._a: any[]) => [
    { id: 'u1', name: 'Owner', email: 'o@b.gr', preferredLanguage: 'el' },
])

vi.mock('@/lib/db', () => ({
    db: {
        notificationEvent: {
            findFirst: vi.fn(async () => null),
            count: vi.fn(async () => 0),
            create: vi.fn(async () => ({})),
        },
        // The bus reads preferences per (user, event) across channels and
        // resolves the recipient's language before delivering.
        notificationPreference: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) },
        user: {
            findMany: (...a: any[]) => userFindMany(...a),
            findUnique: vi.fn(async () => ({ email: 'u@example.com', preferredLanguage: 'en' })),
        },
        policy: { findMany: (...a: any[]) => policyFindMany(...a) },
        gapInstance: { count: vi.fn(async () => 0) },
        protectionScore: { findUnique: vi.fn(() => ({ catch: (_f: any) => Promise.resolve(null) })) },
    },
}))
vi.mock('@/lib/email/email-service', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/email/templates/weekly-digest', () => ({
    getWeeklyDigestEmail: vi.fn(() => ({ subject: 's', html: 'h' })),
}))
vi.mock('@/lib/services/gap-engine/recommendation-generator', () => ({
    getActiveRecommendations: vi.fn(async () => []),
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { runWeeklyDigestJob } from '@/lib/services/weekly-digest.service'

beforeEach(() => {
    vi.clearAllMocks()
    policyFindMany.mockResolvedValue([])
    userFindMany.mockResolvedValue([
        { id: 'u1', name: 'Owner', email: 'o@b.gr', preferredLanguage: 'el' },
    ])
    // A Monday in Athens (the job no-ops on other days). 2026-07-20 is a Monday.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-20T08:00:00+03:00'))
})
afterEach(() => {
    vi.useRealTimers()
})

describe('the weekly digest surfaces every real policy expiring soon', () => {
    it('does not restrict the renewal query to status === "active"', async () => {
        await runWeeklyDigestJob()

        expect(policyFindMany).toHaveBeenCalled()
        const where = policyFindMany.mock.calls[0][0].where
        // The stale-status trap: it must NOT require exactly 'active'.
        expect(where.status).not.toBe('active')
        // It excludes only the non-policy states…
        expect(where.status).toEqual({ notIn: ['deleted', 'analyzing', 'cancelled'] })
    })

    it('the filter admits a policy stored as expiring_soon or action_needed or incomplete', async () => {
        await runWeeklyDigestJob()
        const where = policyFindMany.mock.calls[0][0].where
        const excluded = new Set((where.status as any).notIn as string[])
        for (const inForce of ['active', 'expiring_soon', 'action_needed', 'incomplete']) {
            expect(excluded.has(inForce)).toBe(false)
        }
    })

    it('still keeps the Athens expiry window', async () => {
        await runWeeklyDigestJob()
        const where = policyFindMany.mock.calls[0][0].where
        expect(where.endDate?.gte).toBeInstanceOf(Date)
        expect(where.endDate?.lte).toBeInstanceOf(Date)
    })
})
