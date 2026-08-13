import { describe, it, expect, vi, beforeEach } from 'vitest'

// Pass the guarded handler through so the route logic can be exercised directly;
// auth is mocked separately below (the POST route resolves it internally).
vi.mock('@/lib/api-guard', () => ({
    withApiGuard: (_config: unknown, handler: (ctx: any) => Promise<Response>) => handler,
}))

vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
    db: {
        consentAudit: { create: vi.fn(), findMany: vi.fn() },
        user: { update: vi.fn() },
    },
}))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { CONSENT_COOKIE_NAME, hasAnalyticsConsent, parseConsentCookie } from '@/lib/compliance/consent'
import { POST } from '@/app/api/v1/consents/route'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockAuditCreate = vi.mocked(db.consentAudit.create)
const mockUserUpdate = vi.mocked(db.user.update)

const makeCtx = (body: Record<string, unknown>) => ({
    body,
    ip: '203.0.113.7',
    req: new Request('http://localhost/api/v1/consents', {
        method: 'POST',
        headers: { 'user-agent': 'vitest' },
    }),
})

beforeEach(() => {
    vi.clearAllMocks()
    mockAuditCreate.mockResolvedValue({} as any)
    mockUserUpdate.mockResolvedValue({} as any)
})

describe('POST /api/v1/consents — ai_processing capture', () => {
    it('records an audit row and stamps User.aiProcessingConsentVersion for an authenticated user', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'user-1' } } as any)

        const res = await (POST as any)(makeCtx({
            consentType: 'ai_processing',
            locale: 'el',
            source: 'wallet_add_policy',
        }))

        expect(res.status).toBe(200)
        expect(mockAuditCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'user-1',
                    consentType: 'ai_processing',
                    policyVersion: '2026-07',
                    accepted: true,
                }),
            })
        )
        expect(mockUserUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: expect.objectContaining({ aiProcessingConsentVersion: '2026-07' }),
            })
        )
    })

    it('rejects anonymous ai_processing consent with 401 and writes nothing', async () => {
        mockAuth.mockResolvedValue(null)

        const res = await (POST as any)(makeCtx({
            consentType: 'ai_processing',
            locale: 'en',
            source: 'wallet_add_policy',
        }))

        expect(res.status).toBe(401)
        expect(mockAuditCreate).not.toHaveBeenCalled()
        expect(mockUserUpdate).not.toHaveBeenCalled()
    })

    it('still allows anonymous cookie consent (regression guard for the banner)', async () => {
        mockAuth.mockResolvedValue(null)

        const res = await (POST as any)(makeCtx({
            consentType: 'cookie',
            locale: 'el',
            source: 'banner_accept_all',
        }))

        expect(res.status).toBe(200)
        expect(mockAuditCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ userId: null, consentType: 'cookie' }),
            })
        )
        expect(mockUserUpdate).not.toHaveBeenCalled()
    })
})

/**
 * The response's Set-Cookie is the LAST writer of the consent cookie: it lands
 * after the banner's own `document.cookie` write and overwrites it. So its
 * encoding decides whether every later page load can still read the choice.
 */
describe('POST /api/v1/consents — the cookie it writes back', () => {
    it('is single-encoded, so one decode yields JSON', async () => {
        mockAuth.mockResolvedValue(null)

        const res = await (POST as any)(makeCtx({
            consentType: 'cookie',
            locale: 'el',
            source: 'banner_accept_all',
            categories: { necessary: true, analytics: true, marketing: false },
        }))

        const setCookie = res.headers.get('set-cookie')
        expect(setCookie).toContain(`${CONSENT_COOKIE_NAME}=`)

        // What the browser stores, and hands back verbatim in document.cookie.
        const stored = setCookie!.split(';')[0].slice(`${CONSENT_COOKIE_NAME}=`.length)

        // `response.cookies.set()` percent-encodes what it is given. Passing it
        // an already-encoded string produced `%257B%2522…`, which needed TWO
        // decodes — one is all `parseConsentCookie` used to do, so the reader
        // concluded "never consented" and the banner returned on every page.
        expect(decodeURIComponent(stored).startsWith('{')).toBe(true)

        const parsed = parseConsentCookie(`${CONSENT_COOKIE_NAME}=${stored}`)
        expect(parsed?.categories).toEqual({ necessary: true, analytics: true, marketing: false })
        expect(hasAnalyticsConsent(parsed)).toBe(true)
    })
})
