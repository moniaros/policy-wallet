/**
 * The self-service data-export routes: the expiry flip must PURGE the stored
 * full-PII snapshot (payloadJson previously lived forever after "expired"),
 * a wrong/missing token returns status JSON and never the payload, and the
 * POST failure path must not echo internal error messages to the client.
 * Audit: docs/audits/gdpr-deletion-erasure-2026-07.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-guard', () => ({
    withApiGuard: (_config: unknown, handler: (ctx: any) => Promise<Response>) => handler,
}))

vi.mock('@/lib/db', () => ({
    db: {
        dataExportRequest: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(async () => ({})),
        },
    },
}))

const mockBuildPayload = vi.fn()
vi.mock('@/lib/services/compliance.service', () => ({
    buildUserDataExportPayload: (...a: unknown[]) => (mockBuildPayload as any)(...a),
}))

import { db } from '@/lib/db'
import { GET } from '@/app/api/v1/me/data-export/[id]/route'
import { POST } from '@/app/api/v1/me/data-export/route'

const mockFindFirst = vi.mocked(db.dataExportRequest.findFirst)
const mockCreate = vi.mocked(db.dataExportRequest.create)
const mockUpdate = vi.mocked(db.dataExportRequest.update)

const AUTH = { auth: { dbUser: { id: 'user-1', preferredLanguage: 'en' } } }

function exportRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'exp-1',
        userId: 'user-1',
        status: 'completed',
        requestedAt: new Date('2026-07-01T00:00:00Z'),
        startedAt: new Date('2026-07-01T00:00:01Z'),
        completedAt: new Date('2026-07-01T00:00:02Z'),
        expiresAt: new Date(Date.now() + 60_000),
        downloadToken: 'tok123',
        payloadJson: { user: { email: 'maria@example.com' } },
        errorMessage: null,
        ...overrides,
    }
}

const getCtx = (url: string) => ({
    ...AUTH,
    params: { id: 'exp-1' },
    req: new Request(url),
})

beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({} as any)
})

describe('GET /api/v1/me/data-export/[id]', () => {
    it('purges the PII snapshot and the token when flipping to expired', async () => {
        mockFindFirst.mockResolvedValue(exportRow({ expiresAt: new Date(Date.now() - 1000) }) as any)

        const res = await (GET as any)(getCtx('http://localhost/api/v1/me/data-export/exp-1?token=tok123'))
        const body = await res.json()

        expect(mockUpdate).toHaveBeenCalledTimes(1)
        const update = mockUpdate.mock.calls[0]![0] as any
        expect(update.data.status).toBe('expired')
        expect(update.data.downloadToken).toBeNull()
        expect(update.data).toHaveProperty('payloadJson') // Prisma.JsonNull sentinel
        // And the response must not hand out the (valid-token) download anyway.
        expect(JSON.stringify(body)).not.toContain('maria@example.com')
    })

    it('a wrong token returns status metadata, never the payload', async () => {
        mockFindFirst.mockResolvedValue(exportRow() as any)

        const res = await (GET as any)(getCtx('http://localhost/api/v1/me/data-export/exp-1?token=WRONG'))
        const body = await res.json()

        expect(JSON.stringify(body)).not.toContain('maria@example.com')
        expect(res.headers.get('Content-Disposition')).toBeNull()
    })

    it('a valid token within TTL streams the payload as a download', async () => {
        mockFindFirst.mockResolvedValue(exportRow() as any)

        const res = await (GET as any)(getCtx('http://localhost/api/v1/me/data-export/exp-1?token=tok123'))

        expect(res.headers.get('Content-Disposition')).toContain('attachment')
        expect(await res.text()).toContain('maria@example.com')
    })

    it('is scoped to the requesting user (foreign id → 404)', async () => {
        mockFindFirst.mockResolvedValue(null)

        const res = await (GET as any)(getCtx('http://localhost/api/v1/me/data-export/exp-1'))

        expect(res.status).toBe(404)
        expect((mockFindFirst.mock.calls[0]![0] as any).where).toMatchObject({ userId: 'user-1' })
    })
})

describe('POST /api/v1/me/data-export', () => {
    it('does not echo internal error messages on failure', async () => {
        mockCreate.mockResolvedValue({ id: 'exp-1' } as any)
        mockBuildPayload.mockRejectedValue(new Error('connect ECONNREFUSED db.internal:5432'))

        const res = await (POST as any)({ ...AUTH })
        const text = await res.text()

        expect(res.status).toBe(500)
        expect(text).not.toContain('ECONNREFUSED')
        expect(text).not.toContain('db.internal')
        // ...but the row keeps the real reason for the admin queue.
        const failedWrite = (mockUpdate.mock.calls.at(-1)?.[0] as any).data
        expect(failedWrite.status).toBe('failed')
        expect(failedWrite.errorMessage).toContain('ECONNREFUSED')
    })
})
