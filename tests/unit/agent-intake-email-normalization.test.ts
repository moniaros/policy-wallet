/**
 * Mixed-case input on each agent intake writer resolves to the SAME key auth
 * signs the customer up under. The guard in
 * email-normalization-single-path.test.ts proves the call is present; this
 * proves what reaches Prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── createAgentInvite + bulk import share one mocked graph ──
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
// Partial: agent/actions.ts pulls role helpers from the same module.
vi.mock('@/lib/api-auth', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    requireApiUser: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/services/customer-resolution.service', () => ({
    customerResolutionService: { resolveCustomerCandidates: vi.fn() },
}))
vi.mock('@/lib/services/ai/ai-service.factory', () => ({
    AIServiceFactory: {}, getAIService: vi.fn(() => ({ isAvailable: () => false })),
}))
vi.mock('@/lib/services/collaboration.service', () => ({ collaborationService: {} }))
vi.mock('@/lib/email/invite-emails', () => ({
    sendPolicyInviteEmail: vi.fn(async () => ({ success: true })),
    sendAiConsentRequestEmail: vi.fn(async () => ({ success: true })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Partial: the route builds its responses with the real NextResponse.
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), after: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({
    canAgentAddCustomer: vi.fn(async () => ({ allowed: true })),
    resolveAgentEntitlements: vi.fn(async () => ({ limits: { bulkImportLimit: null } })),
}))

const userFindUnique = vi.fn()
const userCreate = vi.fn()
const userFindMany = vi.fn()
const relFindUnique = vi.fn()
const relFindMany = vi.fn()
const relUpsert = vi.fn()
const inviteCreate = vi.fn()
const txUserCreateManyAndReturn = vi.fn()
const txRelCreateMany = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        user: {
            findUnique: (...a: unknown[]) => userFindUnique(...a),
            create: (...a: unknown[]) => userCreate(...a),
            findMany: (...a: unknown[]) => userFindMany(...a),
        },
        customerRelationship: {
            findUnique: (...a: unknown[]) => relFindUnique(...a),
            findMany: (...a: unknown[]) => relFindMany(...a),
            upsert: (...a: unknown[]) => relUpsert(...a),
        },
        invite: { create: (...a: unknown[]) => inviteCreate(...a) },
        $transaction: (fn: any) => fn({
            user: { createManyAndReturn: (...a: unknown[]) => txUserCreateManyAndReturn(...a) },
            customerRelationship: { createMany: (...a: unknown[]) => txRelCreateMany(...a) },
        }),
    },
}))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { requireApiUser } from '@/lib/api-auth'
import { CustomerService } from '@/lib/services/customer.service'
import { createAgentInvite } from '@/app/(protected)/agent/actions'
import { POST as bulkImport } from '@/app/api/v1/customers/bulk-import/route'

const AGENT = { dbUser: { id: 'agent-1', roles: 'agent', name: 'Agent A', email: 'a@x.gr' } } as any

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUserOrNull).mockResolvedValue(AGENT)
    vi.mocked(requireApiUser).mockResolvedValue({ auth: AGENT } as any)
    userFindUnique.mockResolvedValue(null)
    userCreate.mockImplementation(async ({ data }: any) => ({ id: 'u-new', ...data }))
    userFindMany.mockResolvedValue([])
    relFindUnique.mockResolvedValue(null)
    relFindMany.mockResolvedValue([])
    relUpsert.mockResolvedValue({})
    inviteCreate.mockImplementation(async ({ data }: any) => ({ id: 'inv-1', ...data }))
    txUserCreateManyAndReturn.mockImplementation(async ({ data }: any) =>
        data.map((d: any, i: number) => ({ id: `u-${i}`, email: d.email })))
    txRelCreateMany.mockResolvedValue({ count: 1 })
})

describe('CustomerService.createCustomer', () => {
    it('looks up and creates the phantom under the normalised key', async () => {
        const findUnique = vi.fn(async () => null)
        const create = vi.fn(async ({ data }: any) => ({ id: 'p-1', ...data, password: null, emailVerified: null }))
        const db = {
            user: { findUnique, create, update: vi.fn() },
            customerRelationship: { findUnique: vi.fn(async () => null), create: vi.fn(async (a: any) => ({ id: 'rel-1', ...a.data })) },
            activityLog: { create: vi.fn(async () => ({})) },
        }
        const svc = new CustomerService(db as any)

        await svc.createCustomer('agent-1', { email: '  Maria.P@Example.GR ', name: 'Maria' } as any)

        expect(findUnique).toHaveBeenCalledWith({ where: { email: 'maria.p@example.gr' } })
        expect(create.mock.calls[0]![0].data.email).toBe('maria.p@example.gr')
    })
})

describe('createAgentInvite', () => {
    it('looks up, creates the phantom, and records the invite under the normalised key', async () => {
        const res = await createAgentInvite('  Nikos@X.GR ', 'portfolio')

        expect(res).toMatchObject({ success: true })
        expect(userFindUnique).toHaveBeenCalledWith({ where: { email: 'nikos@x.gr' } })
        expect(userCreate.mock.calls[0]![0].data.email).toBe('nikos@x.gr')
        expect(inviteCreate.mock.calls[0]![0].data.inviteeEmail).toBe('nikos@x.gr')
    })

    it('refuses an address that is not one', async () => {
        const res = await createAgentInvite('not-an-email', 'portfolio')
        expect(res).toMatchObject({ success: false, error: 'VALIDATION_ERROR' })
        expect(userCreate).not.toHaveBeenCalled()
    })
})

describe('POST /api/v1/customers/bulk-import', () => {
    const request = (customers: unknown[]) =>
        new Request('http://localhost/api/v1/customers/bulk-import', {
            method: 'POST',
            body: JSON.stringify({ customers }),
        })

    it('resolves and writes every row under the normalised key', async () => {
        const res = await bulkImport(request([
            { name: 'Nikos', surname: '', email: ' Nikos@X.GR ' },
        ]))
        expect(res.status).toBe(200)

        expect(userFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { email: { in: ['nikos@x.gr'] } },
        }))
        expect(txUserCreateManyAndReturn.mock.calls[0]![0].data[0].email).toBe('nikos@x.gr')
    })

    it('treats two spellings of one address as ONE customer', async () => {
        const res = await bulkImport(request([
            { name: 'Nikos', email: 'nikos@x.gr' },
            { name: 'Nikos', email: 'NIKOS@X.GR' },
        ]))
        const body = await res.json()
        expect(body.data.imported).toBe(1)
        expect(body.data.outcomes.map((o: any) => o.code)).toEqual(['CREATED', 'DUPLICATE_IN_FILE'])
        expect(txUserCreateManyAndReturn.mock.calls[0]![0].data).toHaveLength(1)
    })
})
