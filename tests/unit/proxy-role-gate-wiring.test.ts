import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Wiring proof for the role gate: the REAL proxy() — not the pure classifier —
 * lets a policyholder through to /protection and bounces an agent.
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
    it('301s a policyholder from /protection to /see (Grafí G8) — the §4.2 surface moved, its URL did not die', async () => {
        sessionFor('policyholder')
        const res = await run('/protection')
        expect(res.status).toBe(301)
        expect(res.headers.get('location')).toBe('http://localhost:3000/see')
    })

    it('bounces an agent off /protection to their own home', async () => {
        sessionFor('agent')
        const res = await run('/protection')
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

    it('keeps a policyholder out of the review child while their /wallet/add stays open', async () => {
        sessionFor('policyholder')
        expect((await run('/wallet/add')).status).toBe(200)
        const res = await run('/wallet/pol-1/review')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    // ── Grafí (G8): /protection, /wallet, /wallet/[id] 301 to their successors ──
    it('301s the three legacy policyholder surfaces to /see, /policies and /policies/[id] — deeper /wallet paths untouched', async () => {
        sessionFor('policyholder')
        const cases: Array<[string, string]> = [
            ['/protection', '/see'],
            ['/protection/', '/see'],
            ['/protection?lens=risk', '/see'],
            ['/wallet', '/policies'],
            ['/wallet?q=x', '/policies?q=x'],
            ['/wallet/pol-1', '/policies/pol-1'],
        ]
        for (const [from, to] of cases) {
            const res = await run(from)
            expect(res.status, from).toBe(301)
            expect(res.headers.get('location'), from).toBe(`http://localhost:3000${to}`)
        }
        expect((await run('/wallet/pol-1/edit')).status, '/wallet/pol-1/edit keeps serving').toBe(200)
        expect((await run('/protection/motor')).status, '/protection/[branch] keeps serving').toBe(200)
        expect((await run('/see')).status).toBe(200)
        // G9: the bell moves with the policyholder; agents keep the legacy page.
        expect((await run('/notifications')).status).toBe(301)
        expect((await run('/notifications')).headers.get('location')).toBe('http://localhost:3000/updates')
        expect((await run('/updates')).status).toBe(200)
        expect((await run('/policies/pol-1')).status).toBe(200)
        sessionFor('agent')
        expect((await run('/wallet')).status, 'an agent is not rewritten').not.toBe(301)
        expect((await run('/notifications')).status, 'agents keep /notifications').not.toBe(301)
    })

    // ── Grafí (G7): the application home is `/` ──────────────────────────
    it('rewrites `/` to the app home for a policyholder — URL unchanged, marketing untouched for everyone else', async () => {
        sessionFor('policyholder')
        const res = await run('/')
        expect(res.status).toBe(200)
        expect(res.headers.get('x-middleware-rewrite')).toBe('http://localhost:3000/home')
        sessionFor('agent')
        expect((await run('/')).headers.get('x-middleware-rewrite')).toBeNull()
        sessionFor(null)
        expect((await run('/')).headers.get('x-middleware-rewrite')).toBeNull()
    })

    it('301s the old policyholder home and the internal path to `/`', async () => {
        sessionFor('policyholder')
        for (const path of ['/dashboard', '/home']) {
            const res = await run(path)
            expect(res.status, path).toBe(301)
            expect(res.headers.get('location'), path).toBe('http://localhost:3000/')
        }
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
        const res = await run('/protection')
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/auth/signin?callbackUrl=')
    })
})
