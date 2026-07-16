import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '@/lib/errors'

// ── Mock side-effecting deps BEFORE importing the action module ──
vi.mock('@/lib/auth-helpers', () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))

const mockCreateCustomer = vi.fn()
vi.mock('@/lib/services/customer.service', () => ({
    CustomerService: class {
        createCustomer(...args: unknown[]) { return mockCreateCustomer(...args) }
    },
}))
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
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const canAgentAddCustomer = vi.fn()
const canAgentAddPolicyForCustomer = vi.fn()
const canAgentRunAnalysis = vi.fn()
vi.mock('@/lib/subscription-entitlements', () => ({
    canAgentAddCustomer: (...a: unknown[]) => canAgentAddCustomer(...a),
    canAgentAddPolicyForCustomer: (...a: unknown[]) => canAgentAddPolicyForCustomer(...a),
    canAgentRunAnalysis: (...a: unknown[]) => canAgentRunAnalysis(...a),
}))

const userFindUnique = vi.fn()
const userUpdate = vi.fn()
const relFindFirst = vi.fn()
const relUpdate = vi.fn()
const notifCreate = vi.fn()
const dbTransaction = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: (...a: unknown[]) => userFindUnique(...a), update: (...a: unknown[]) => userUpdate(...a) },
        customerRelationship: {
            findFirst: (...a: unknown[]) => relFindFirst(...a),
            update: (...a: unknown[]) => relUpdate(...a),
        },
        notificationEvent: { create: (...a: unknown[]) => notifCreate(...a) },
        $transaction: (...a: unknown[]) => dbTransaction(...a),
    },
}))

import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { commitScannedPolicy } from '@/app/(protected)/agent/actions'

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)

const AGENT = { dbUser: { id: 'agent-1', roles: 'agent', name: 'Agent A', email: 'a@x.gr', preferredLanguage: 'en' } } as any

const POLICY = {
    insurerName: 'Allianz', policyNumber: 'P-1', lineOfBusiness: 'motor',
    startDate: '2026-01-01', endDate: '2027-01-01', premiumAmount: 500,
}

beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(AGENT)
    canAgentAddCustomer.mockResolvedValue({ allowed: true })
    canAgentAddPolicyForCustomer.mockResolvedValue({ allowed: true })
    canAgentRunAnalysis.mockResolvedValue({ allowed: true })
    // A usable relationship so addPolicyForCustomer's gate passes.
    relFindFirst.mockResolvedValue({ id: 'rel-1', status: 'active' })
    relUpdate.mockResolvedValue({})
    notifCreate.mockResolvedValue({})
    userUpdate.mockResolvedValue({})
    userFindUnique.mockResolvedValue(null)
    // Policy create + grant inside the atomic transaction.
    dbTransaction.mockImplementation(async (fn: any) => fn({
        policy: { create: vi.fn(async () => ({ id: 'pol-1', policyNumber: 'P-1', lineOfBusiness: 'motor', insurerName: 'Allianz' })) },
        accessGrant: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    }))
})

describe('commitScannedPolicy', () => {
    it('rejects a non-agent caller', async () => {
        mockAuth.mockResolvedValue({ dbUser: { id: 'u', roles: 'policyholder' } } as any)
        const res = await commitScannedPolicy({ mode: 'attach', customerId: 'c1' }, POLICY)
        expect(res).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('create_new: gates the customer cap, creates the customer with ΑΦΜ, then the policy', async () => {
        mockCreateCustomer.mockResolvedValue({ policyholderUserId: 'cust-new' })

        const res = await commitScannedPolicy(
            { mode: 'create_new', customer: { name: 'Nikos', surname: 'Ioannou', email: 'nikos@x.gr', phone: '6900000000', taxId: '123456783' } },
            POLICY,
        )

        expect(canAgentAddCustomer).toHaveBeenCalledWith('agent-1')
        expect(mockCreateCustomer).toHaveBeenCalledWith('agent-1', expect.objectContaining({
            email: 'nikos@x.gr', name: 'Nikos Ioannou', phoneNumber: '6900000000', taxId: '123456783',
        }))
        expect(res).toMatchObject({ success: true, policyId: 'pol-1', customerId: 'cust-new', created: true })
    })

    it('create_new: blocks when the customer cap is reached and never creates', async () => {
        canAgentAddCustomer.mockResolvedValue({ allowed: false, current: 50, limit: 50, reason: 'cap' })

        const res = await commitScannedPolicy(
            { mode: 'create_new', customer: { name: 'N', email: 'n@x.gr' } },
            POLICY,
        )

        expect(res.success).toBe(false)
        expect(mockCreateCustomer).not.toHaveBeenCalled()
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it('create_new: on relationship conflict, falls back to attaching to the existing customer', async () => {
        mockCreateCustomer.mockRejectedValue(AppError.conflict('Customer already exists in your list'))
        userFindUnique.mockImplementation(async ({ where }: any) =>
            where?.email ? { id: 'existing-cust' } : null,
        )

        const res = await commitScannedPolicy(
            { mode: 'create_new', customer: { name: 'N', email: 'dupe@x.gr', taxId: '123456783' } },
            POLICY,
        )

        expect(res).toMatchObject({ success: true, policyId: 'pol-1', customerId: 'existing-cust', created: false })
    })

    it('attach: backfills ΑΦΜ only when the existing customer has none', async () => {
        userFindUnique.mockImplementation(async ({ select }: any) =>
            select?.taxId ? { taxId: null } : null,
        )

        await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9', taxId: '123456783' }, POLICY)

        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'cust-9' }, data: { taxId: '123456783' },
        }))
    })

    it('attach: does NOT overwrite an ΑΦΜ the customer already has', async () => {
        userFindUnique.mockImplementation(async ({ select }: any) =>
            select?.taxId ? { taxId: '999999999' } : null,
        )

        await commitScannedPolicy({ mode: 'attach', customerId: 'cust-9', taxId: '123456783' }, POLICY)

        expect(userUpdate).not.toHaveBeenCalled()
    })
})
