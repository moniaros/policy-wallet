import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Wiring proof for the role gate: the REAL proxy() — not the pure classifier —
 * lets a policyholder through to /insights/risk-profile and bounces an agent.
 *
 * The route-ownership guard drives decideRoleRedirect directly; a mutation
 * that unhooked proxy() from that function would still pass it. This file
 * closes that seam: it runs the exported proxy() end to end with a mocked
 * session and asserts on the HTTP response it returns, so the assertion can
 * only go green if the request actually flowed through the classification.
 */

const { getUserMock } = vi.hoisted(() => ({
    getUserMock: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({ auth: { getUser: getUserMock } }),
}))

vi.mock('@/lib/rate-limit', () => ({
    rateLimit: vi.fn(async () => ({ success: true })),
}))

import { proxy } from '@/proxy'

function sessionFor(role: string | null) {
    getUserMock.mockResolvedValue({
        data: {
            user: role === null
                ? null
                : { id: 'user-1', email: 'u@example.com', user_metadata: { role } },
        },
    })
}

const run = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`))

beforeEach(() => {
    getUserMock.mockReset()
})

describe('proxy() role gate wiring', () => {
    it('lets a policyholder reach /insights/risk-profile (the B2C surface under an agent parent)', async () => {
        sessionFor('policyholder')
        const res = await run('/insights/risk-profile')
        expect(res.status).toBe(200)
        expect(res.headers.get('location')).toBeNull()
    })

    it('bounces an agent off /insights/risk-profile to their own home', async () => {
        sessionFor('agent')
        const res = await run('/insights/risk-profile')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard/agent')
    })

    it('still bounces a policyholder off /insights (the adviser book)', async () => {
        sessionFor('policyholder')
        const res = await run('/insights')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('lets an agent reach /insights and /wallet/[id]/review (their extraction review)', async () => {
        sessionFor('agent')
        expect((await run('/insights')).status).toBe(200)
        expect((await run('/wallet/pol-1/review')).status).toBe(200)
    })

    it('keeps a policyholder out of the review child while their /wallet stays open', async () => {
        sessionFor('policyholder')
        expect((await run('/wallet/pol-1')).status).toBe(200)
        const res = await run('/wallet/pol-1/review')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('keeps /dashboard vs /dashboard/agent loop-free for agents', async () => {
        sessionFor('agent')
        const res = await run('/dashboard')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard/agent')
        expect((await run('/dashboard/agent')).status).toBe(200)
    })

    it('keeps the anonymous wall in front of the whole tree', async () => {
        sessionFor(null)
        const res = await run('/insights/risk-profile')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/auth/signin?callbackUrl=')
    })
})
