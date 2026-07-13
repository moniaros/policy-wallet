import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireApiUser = vi.fn()
const findUniquePolicy = vi.fn()
const resolveUserEntitlements = vi.fn()
const createReportUnlockCheckoutSession = vi.fn()
const recordConversionEvent = vi.fn()

vi.mock('@/lib/api-auth', () => ({
    requireApiUser: (...args: any[]) => requireApiUser(...args),
}))
vi.mock('@/lib/db', () => ({
    db: { policy: { findUnique: (...args: any[]) => findUniquePolicy(...args) } },
}))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: {} } }))
vi.mock('@/lib/billing', () => ({
    createReportUnlockCheckoutSession: (...args: any[]) => createReportUnlockCheckoutSession(...args),
}))
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: (...args: any[]) => resolveUserEntitlements(...args),
}))
vi.mock('@/lib/journey/conversion-events', () => ({
    recordConversionEvent: (...args: any[]) => recordConversionEvent(...args),
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { POST } from '@/app/api/v1/policies/[id]/report-unlock/route'

function makeRequest(body?: unknown) {
    return new Request('http://localhost/api/v1/policies/p1/report-unlock', {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
    })
}

const params = { params: Promise.resolve({ id: 'p1' }) }

beforeEach(() => {
    requireApiUser.mockReset()
    findUniquePolicy.mockReset()
    resolveUserEntitlements.mockReset()
    createReportUnlockCheckoutSession.mockReset()
    recordConversionEvent.mockReset()
    requireApiUser.mockResolvedValue({ auth: { dbUser: { id: 'u1' } } })
})

describe('POST /api/v1/policies/[id]/report-unlock', () => {
    // Regression pin: unlike token packs, the €3 unlock MUST be available to
    // the free tier — it exists precisely for post-trial free users.
    it('gives a free-tier owner a checkout url', async () => {
        findUniquePolicy.mockResolvedValue({ id: 'p1', ownerUserId: 'u1', reportUnlockedAt: null })
        resolveUserEntitlements.mockResolvedValue({ tier: 'free' })
        createReportUnlockCheckoutSession.mockResolvedValue({
            id: 'cs_1',
            url: 'https://stripe.test/cs_1',
            amountEur: 3,
        })

        const response = await POST(makeRequest({ returnTo: '/wallet/p1#analysis' }), params)
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.data.checkout_url).toBe('https://stripe.test/cs_1')
        expect(createReportUnlockCheckoutSession).toHaveBeenCalledWith('u1', 'p1', '/wallet/p1#analysis')
        expect(recordConversionEvent).toHaveBeenCalledWith('u1', 'checkout_started', {
            source: 'report_unlock',
            policyId: 'p1',
        })
    })

    it('404s for non-owners (no existence leak)', async () => {
        findUniquePolicy.mockResolvedValue({ id: 'p1', ownerUserId: 'someone-else', reportUnlockedAt: null })

        const response = await POST(makeRequest(), params)

        expect(response.status).toBe(404)
        expect(createReportUnlockCheckoutSession).not.toHaveBeenCalled()
    })

    it('returns already_unlocked without a session when the policy is unlocked', async () => {
        findUniquePolicy.mockResolvedValue({
            id: 'p1',
            ownerUserId: 'u1',
            reportUnlockedAt: new Date('2026-07-13'),
        })
        resolveUserEntitlements.mockResolvedValue({ tier: 'free' })

        const response = await POST(makeRequest(), params)
        const payload = await response.json()

        expect(payload.data.already_unlocked).toBe(true)
        expect(createReportUnlockCheckoutSession).not.toHaveBeenCalled()
    })

    it('returns already_unlocked for paid tiers (plan already covers the report)', async () => {
        findUniquePolicy.mockResolvedValue({ id: 'p1', ownerUserId: 'u1', reportUnlockedAt: null })
        resolveUserEntitlements.mockResolvedValue({ tier: 'plus' })

        const response = await POST(makeRequest(), params)
        const payload = await response.json()

        expect(payload.data.already_unlocked).toBe(true)
        expect(createReportUnlockCheckoutSession).not.toHaveBeenCalled()
    })
})
