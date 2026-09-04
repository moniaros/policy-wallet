import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ENDED_RELATIONSHIP_STATUSES } from '@/lib/agent-visibility'

/**
 * POST /api/v1/customers/bulk-import.
 *
 * Two defects this pins:
 *   • the route created relationships with `status: 'inactive'` — an ENDED
 *     status per lib/agent-visibility.ts — so every imported customer was a
 *     dead row: invisible, and nobody could upload for them;
 *   • `surname: z.string().min(1).optional().default('')` rejects '' under
 *     zod 4, so a CSV without surnames failed every row with VALIDATION_ERROR.
 */

const repoRoot = join(__dirname, '..', '..')
const ROUTE = 'app/api/v1/customers/bulk-import/route.ts'

vi.mock('@/lib/api-auth', () => ({ requireApiUser: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
const canAgentAddCustomer = vi.fn()
vi.mock('@/lib/subscription-entitlements', () => ({
    canAgentAddCustomer: (...a: unknown[]) => canAgentAddCustomer(...a),
    resolveAgentEntitlements: vi.fn(async () => ({ limits: { bulkImportLimit: null } })),
}))

const userFindMany = vi.fn()
const relFindMany = vi.fn()
const txUserCreateManyAndReturn = vi.fn()
const txUserUpdate = vi.fn()
const txRelCreateMany = vi.fn()
const txProfileCreateMany = vi.fn()
const dbTransaction = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        user: { findMany: (...a: unknown[]) => userFindMany(...a) },
        customerRelationship: { findMany: (...a: unknown[]) => relFindMany(...a) },
        $transaction: (...a: unknown[]) => dbTransaction(...a),
    },
}))

import { requireApiUser } from '@/lib/api-auth'
import { POST } from '@/app/api/v1/customers/bulk-import/route'

const request = (body: unknown) =>
    new Request('http://localhost/api/v1/customers/bulk-import', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireApiUser).mockResolvedValue({ auth: { dbUser: { id: 'agent-1' } } } as any)
    canAgentAddCustomer.mockResolvedValue({ allowed: true, current: 2, limit: 100 })
    userFindMany.mockResolvedValue([])
    relFindMany.mockResolvedValue([])
    txUserCreateManyAndReturn.mockImplementation(async ({ data }: any) =>
        data.map((d: any, i: number) => ({ id: `u-${i}`, email: d.email })))
    txRelCreateMany.mockResolvedValue({ count: 1 })
    txProfileCreateMany.mockResolvedValue({ count: 1 })
    txUserUpdate.mockResolvedValue({})
    dbTransaction.mockImplementation(async (fn: any) => fn({
        user: {
            createManyAndReturn: (...a: unknown[]) => txUserCreateManyAndReturn(...a),
            update: (...a: unknown[]) => txUserUpdate(...a),
        },
        policyholderProfile: { createMany: (...a: unknown[]) => txProfileCreateMany(...a) },
        customerRelationship: { createMany: (...a: unknown[]) => txRelCreateMany(...a) },
    }))
})

describe('POST /api/v1/customers/bulk-import', () => {
    it('imports a row with an empty surname', async () => {
        const res = await POST(request({ customers: [{ name: 'Nikos', surname: '', email: 'nikos@x.gr' }] }))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data).toMatchObject({ imported: 1, skipped: 0, failed: 0, total: 1 })
        expect(body.data.outcomes).toEqual([{ row: 1, email: 'nikos@x.gr', status: 'imported', code: 'CREATED' }])
        expect(txUserCreateManyAndReturn.mock.calls[0]![0].data[0]).toMatchObject({ email: 'nikos@x.gr', name: 'Nikos' })
    })

    it('creates the relationship PENDING and not yet invited — never in an ended status', async () => {
        await POST(request({ customers: [{ name: 'Nikos', email: 'nikos@x.gr' }] }))
        const row = txRelCreateMany.mock.calls[0]![0].data[0]
        expect(row).toMatchObject({
            agentUserId: 'agent-1',
            policyholderUserId: 'u-0',
            status: 'pending_activation',
            activationStatus: 'not_invited',
        })
        expect(ENDED_RELATIONSHIP_STATUSES).not.toContain(row.status)
    })

    it('links an existing user without creating one, and never touches an existing relationship', async () => {
        userFindMany.mockResolvedValue([{ id: 'u-existing', email: 'maria@x.gr' }, { id: 'u-linked', email: 'linked@x.gr' }])
        relFindMany.mockResolvedValue([{ policyholderUserId: 'u-linked', status: 'active' }])

        const res = await POST(request({ customers: [
            { name: 'Maria', email: 'maria@x.gr' },
            { name: 'Linked', email: 'linked@x.gr' },
        ] }))
        const body = await res.json()

        expect(body.data.outcomes).toEqual([
            { row: 1, email: 'maria@x.gr', status: 'imported', code: 'LINKED' },
            { row: 2, email: 'linked@x.gr', status: 'skipped', code: 'ALREADY_LINKED' },
        ])
        expect(txUserCreateManyAndReturn).not.toHaveBeenCalled()
        expect(txRelCreateMany.mock.calls[0]![0].data.map((r: any) => r.policyholderUserId)).toEqual(['u-existing'])
    })

    it('does not re-open an ended relationship', async () => {
        userFindMany.mockResolvedValue([{ id: 'u-gone', email: 'gone@x.gr' }])
        relFindMany.mockResolvedValue([{ policyholderUserId: 'u-gone', status: 'terminated' }])

        const res = await POST(request({ customers: [{ name: 'Gone', email: 'gone@x.gr' }] }))
        const body = await res.json()

        expect(body.data.outcomes).toEqual([{ row: 1, email: 'gone@x.gr', status: 'skipped', code: 'RELATIONSHIP_ENDED' }])
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it('counts only genuinely new customers against the headroom', async () => {
        canAgentAddCustomer.mockResolvedValue({ allowed: true, current: 99, limit: 100 })
        userFindMany.mockResolvedValue([{ id: 'u-linked', email: 'linked@x.gr' }])
        relFindMany.mockResolvedValue([{ policyholderUserId: 'u-linked', status: 'active' }])

        const ok = await POST(request({ customers: [{ name: 'L', email: 'linked@x.gr' }, { name: 'N', email: 'new@x.gr' }] }))
        expect(ok.status).toBe(200)

        const refused = await POST(request({ customers: [{ name: 'A', email: 'a@x.gr' }, { name: 'B', email: 'b@x.gr' }] }))
        expect(refused.status).toBe(403)
        const body = await refused.json()
        expect(body.error.code).toBe('CUSTOMER_HEADROOM_EXCEEDED')
        expect(body.error.details).toMatchObject({ adding: 2, headroom: 1 })
    })

    it('marks every row of a failed chunk failed and keeps going', async () => {
        dbTransaction.mockRejectedValueOnce(new Error('db down'))
        const res = await POST(request({ customers: [{ name: 'A', email: 'a@x.gr' }] }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.data.outcomes).toEqual([{ row: 1, email: 'a@x.gr', status: 'failed', code: 'WRITE_FAILED' }])
        expect(body.data.errors).toEqual(['Failed to import a@x.gr'])
    })

    it('writes in chunks of 50', async () => {
        canAgentAddCustomer.mockResolvedValue({ allowed: true }) // unlimited plan
        const customers = Array.from({ length: 120 }, (_, i) => ({ name: `C${i}`, email: `c${i}@x.gr` }))
        const res = await POST(request({ customers }))
        const body = await res.json()
        expect(body.data.imported).toBe(120)
        expect(dbTransaction).toHaveBeenCalledTimes(3)
        expect(txUserCreateManyAndReturn.mock.calls.map((c) => c[0].data.length)).toEqual([50, 50, 20])
    })

    it('refuses a row without a name as VALIDATION_ERROR', async () => {
        const res = await POST(request({ customers: [{ name: '', email: 'nikos@x.gr' }] }))
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    // ── ΑΦΜ: the CSV parser carried the column; the schema silently dropped it ──

    it('writes a normalised ΑΦΜ onto the phantom it creates', async () => {
        const res = await POST(request({ customers: [{ name: 'Nikos', email: 'nikos@x.gr', taxId: ' 123 456 783 ' }] }))
        expect(res.status).toBe(200)
        expect(txUserCreateManyAndReturn.mock.calls[0]![0].data[0]).toMatchObject({ email: 'nikos@x.gr', taxId: '123456783' })
        expect(txUserUpdate).not.toHaveBeenCalled()
    })

    it('backfills an existing PHANTOM without one, but never an activated account', async () => {
        userFindMany.mockResolvedValue([
            // Phantom (no password, never verified), no ΑΦΜ yet → written.
            { id: 'u-phantom', email: 'phantom@x.gr', password: null, emailVerified: null, taxId: null },
            // Activated (verified) → the customer's to set; ignored.
            { id: 'u-live', email: 'live@x.gr', password: null, emailVerified: new Date('2026-01-01'), taxId: null },
            // Phantom that already has one → never overwritten.
            { id: 'u-has', email: 'has@x.gr', password: null, emailVerified: null, taxId: '999999999' },
        ])

        const res = await POST(request({ customers: [
            { name: 'P', email: 'phantom@x.gr', taxId: '123456783' },
            { name: 'L', email: 'live@x.gr', taxId: '123456783' },
            { name: 'H', email: 'has@x.gr', taxId: '123456783' },
        ] }))
        expect(res.status).toBe(200)

        expect(txUserUpdate).toHaveBeenCalledTimes(1)
        expect(txUserUpdate).toHaveBeenCalledWith({ where: { id: 'u-phantom' }, data: { taxId: '123456783' } })
        expect(txUserCreateManyAndReturn).not.toHaveBeenCalled()
    })

    it('refuses a 9-digit ΑΦΜ that fails the checksum as VALIDATION_ERROR', async () => {
        const res = await POST(request({ customers: [{ name: 'Nikos', email: 'nikos@x.gr', taxId: '123456789' }] }))
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    // ── The profile row createCustomer gives a phantom; the route gave none ──

    it('creates a policyholder profile for every user it creates, in the same transaction', async () => {
        const res = await POST(request({ customers: [{ name: 'A', email: 'a@x.gr' }, { name: 'B', email: 'b@x.gr' }] }))
        expect(res.status).toBe(200)
        expect(txProfileCreateMany).toHaveBeenCalledTimes(1)
        expect(txProfileCreateMany).toHaveBeenCalledWith({
            data: [{ userId: 'u-0' }, { userId: 'u-1' }],
            skipDuplicates: true,
        })
        // Same transaction as the users: the profile write happens inside the
        // callback the route handed to $transaction, never on the outer client.
        expect(dbTransaction).toHaveBeenCalledTimes(1)
    })

    it('creates no profile for a row that only links an existing user', async () => {
        userFindMany.mockResolvedValue([{ id: 'u-existing', email: 'maria@x.gr' }])
        await POST(request({ customers: [{ name: 'Maria', email: 'maria@x.gr' }] }))
        expect(txUserCreateManyAndReturn).not.toHaveBeenCalled()
        expect(txProfileCreateMany).not.toHaveBeenCalled()
    })

    // ── D3: a row with no email imports on a valid ΑΦΜ + Greek mobile ──

    it('imports a row without an email under the synthetic address, flagged', async () => {
        const res = await POST(request({ customers: [{ name: 'Kostas', email: '', taxId: '123456783', phone: '6912345678' }] }))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.outcomes).toEqual([{
            row: 1, email: 'noemail+123456783@customers.policywallet.invalid', status: 'imported', code: 'CREATED',
        }])
        expect(txUserCreateManyAndReturn.mock.calls[0]![0].data[0]).toMatchObject({
            email: 'noemail+123456783@customers.policywallet.invalid',
            contactEmailMissing: true,
            taxId: '123456783',
            phoneNumber: '6912345678',
        })
        expect(userFindMany.mock.calls[0]![0].where.email.in).toEqual(['noemail+123456783@customers.policywallet.invalid'])
    })

    it('a row with a real email is never flagged', async () => {
        await POST(request({ customers: [{ name: 'Nikos', email: 'nikos@x.gr' }] }))
        expect(txUserCreateManyAndReturn.mock.calls[0]![0].data[0]).toMatchObject({ email: 'nikos@x.gr', contactEmailMissing: false })
    })

    it('refuses a row with no email and no ΑΦΜ, or a landline, as VALIDATION_ERROR on that row\'s email', async () => {
        for (const row of [
            { name: 'NoAfm', email: '', phone: '6912345678' },
            { name: 'Landline', email: '', taxId: '123456783', phone: '2101234567' },
            { name: 'ForeignVat', email: '', taxId: '12345678', phone: '6912345678' },
        ]) {
            const res = await POST(request({ customers: [row] }))
            expect(res.status, row.name).toBe(400)
            const body = await res.json()
            expect(body.error.code).toBe('VALIDATION_ERROR')
            expect(body.error.details.some((d: any) => d.path.join('.') === 'customers.0.email' && d.message === 'contact_required'), row.name).toBe(true)
        }
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it('two agents importing the same no-email customer converge on one row', async () => {
        // The second agent's import finds the phantom the first one created.
        userFindMany.mockResolvedValue([{ id: 'u-shared', email: 'noemail+123456783@customers.policywallet.invalid', password: null, emailVerified: null, taxId: '123456783' }])
        const res = await POST(request({ customers: [{ name: 'Kostas', email: '', taxId: '123456783', phone: '6912345678' }] }))
        const body = await res.json()
        expect(body.data.outcomes[0]).toMatchObject({ status: 'imported', code: 'LINKED' })
        expect(txUserCreateManyAndReturn).not.toHaveBeenCalled()
        expect(txRelCreateMany.mock.calls[0]![0].data[0].policyholderUserId).toBe('u-shared')
    })
})

// ── Source guard: the route never writes an ENDED status ──

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** Every `status: '<value>'` written where the value is an ended relationship status. */
export function endedStatusWrites(source: string): string[] {
    const code = stripComments(source)
    const ended = new Set<string>(ENDED_RELATIONSHIP_STATUSES)
    return [...code.matchAll(/\bstatus:\s*(["'])([a-z_]+)\1/g)]
        .map((m) => m[2])
        .filter((value) => ended.has(value))
}

describe('the bulk-import route never creates a relationship in an ended status', () => {
    it('writes no status from ENDED_RELATIONSHIP_STATUSES', () => {
        const source = readFileSync(join(repoRoot, ROUTE), 'utf8')
        expect(
            endedStatusWrites(source),
            `A relationship created as ${[...ENDED_RELATIONSHIP_STATUSES].join('/')} is dead on arrival: ` +
                'agent-visibility closes both arms for it and nobody can upload for the customer.'
        ).toEqual([])
    })

    it('the matcher is proven against a committed probe', () => {
        const probe = readFileSync(join(repoRoot, 'tests/fixtures/guard-probes/bulk-import-ended-status.ts.txt'), 'utf8')
        expect(endedStatusWrites(probe)).toEqual(['inactive'])
    })
})
