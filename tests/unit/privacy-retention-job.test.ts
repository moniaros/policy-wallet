/**
 * The daily privacy-retention sweep (app/api/v1/jobs/privacy-retention):
 * purges expired data-export PII snapshots and long-dead invites (third-party
 * email PII), and refuses to run without cron/admin authorization.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const exportUpdateMany = vi.fn(async (_a?: any) => ({ count: 2 }))
const inviteDeleteMany = vi.fn(async (_a?: any) => ({ count: 3 }))

const formDeleteMany = vi.fn(async (_a?: any) => ({ count: 4 }))
const activityDeleteMany = vi.fn(async (_a?: any) => ({ count: 5 }))

vi.mock('@/lib/db', () => ({
    db: {
        dataExportRequest: { updateMany: (...a: unknown[]) => (exportUpdateMany as any)(...a) },
        invite: { deleteMany: (...a: unknown[]) => (inviteDeleteMany as any)(...a) },
        formSubmission: { deleteMany: (...a: unknown[]) => (formDeleteMany as any)(...a) },
        activityLog: { deleteMany: (...a: unknown[]) => (activityDeleteMany as any)(...a) },
    },
}))

const requireApiUser = vi.fn(async () => ({ error: new Response('unauthorized', { status: 401 }) }))
vi.mock('@/lib/api-auth', () => ({
    requireApiUser: (...a: unknown[]) => (requireApiUser as any)(...a),
}))

import { POST } from '@/app/api/v1/jobs/privacy-retention/route'

const originalSecret = process.env.CRON_SECRET

beforeEach(() => {
    vi.clearAllMocks()
    exportUpdateMany.mockResolvedValue({ count: 2 })
    inviteDeleteMany.mockResolvedValue({ count: 3 })
    process.env.CRON_SECRET = 'test-secret'
})

afterEach(() => {
    process.env.CRON_SECRET = originalSecret
})

const cronRequest = (secret?: string) =>
    new Request('http://localhost/api/v1/jobs/privacy-retention', {
        method: 'POST',
        headers: secret ? { 'x-cron-secret': secret } : {},
    })

describe('privacy-retention job', () => {
    it('purges expired export payloads and stale invites with the right filters', async () => {
        const res = await POST(cronRequest('test-secret'))
        const body = await res.json()

        expect(body.data).toEqual({
            purged_export_payloads: 2,
            purged_invites: 3,
            purged_form_submissions: 4,
            purged_admin_audit_logs: 5,
            purged_user_activity_logs: 5,
        })

        // Owner-decided retention windows: 24 months for form submissions.
        //
        // ActivityLog is now swept TWICE, because it holds two different things
        // under one schema. Administrator actions (stamped `metadata._audit`) are
        // accountability records and keep the policy's 5 years; ordinary user
        // activity — AI questions, logins, uploads — is a technical log, which
        // the same policy publishes as "up to 12 months". One clock over the
        // whole table applied the longer line to customers' usage logs.
        const DAY = 24 * 60 * 60 * 1000
        const formCutoff = formDeleteMany.mock.calls[0]![0].where.createdAt.lte as Date
        expect(Math.round((Date.now() - formCutoff.getTime()) / DAY)).toBe(730)

        const [adminSweep, userSweep] = activityDeleteMany.mock.calls.map((c) => c![0])
        expect(Math.round((Date.now() - (adminSweep.where.timestamp.lte as Date).getTime()) / DAY)).toBe(5 * 365)
        expect(adminSweep.where.metadata.path).toEqual(['_audit'])
        expect(Math.round((Date.now() - (userSweep.where.timestamp.lte as Date).getTime()) / DAY)).toBe(365)
        expect(userSweep.where.metadata.path).toEqual(['_audit'])
        // The two sweeps must select DISJOINT sets, or the shorter window would
        // also delete the accountability records.
        expect(adminSweep.where.metadata).not.toEqual(userSweep.where.metadata)

        const exportArgs = exportUpdateMany.mock.calls[0]![0]
        expect(exportArgs.where.status.in).toEqual(['completed', 'expired'])
        expect(exportArgs.where.expiresAt.lte).toBeInstanceOf(Date)
        expect(exportArgs.data.downloadToken).toBeNull()
        expect(exportArgs.data.status).toBe('expired')
        expect(exportArgs.data).toHaveProperty('payloadJson')

        const inviteArgs = inviteDeleteMany.mock.calls[0]![0]
        // consumed long ago, or never consumed and long expired
        expect(inviteArgs.where.OR).toHaveLength(2)
        expect(inviteArgs.where.OR[0].consumedAt.lte).toBeInstanceOf(Date)
        expect(inviteArgs.where.OR[1]).toMatchObject({ consumedAt: null })
    })

    it('rejects without cron secret or admin session', async () => {
        const res = await POST(cronRequest('wrong'))

        expect(res.status).toBe(401)
        expect(exportUpdateMany).not.toHaveBeenCalled()
        expect(inviteDeleteMany).not.toHaveBeenCalled()
        expect(formDeleteMany).not.toHaveBeenCalled()
        expect(activityDeleteMany).not.toHaveBeenCalled()
    })
})
