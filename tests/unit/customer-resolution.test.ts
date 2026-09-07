import { describe, it, expect, vi, beforeEach } from 'vitest'
// A-01: credential PRESENCE is a query now; these mocks carry no credential, so presence is false throughout.
vi.mock("@/lib/services/credential-signals", () => ({
    passwordPresence: async () => new Set<string>(),
    hasPasswordCredential: async () => false,
    withCredentialSignals: async (_db: unknown, rows: Array<Record<string, unknown>>) => rows.map((r) => ({ ...r, hasPassword: false })),
}))

// Resolution is scoped to the agent's own customers; mock the DB + visibility.
const relFindMany = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        customerRelationship: { findMany: (...a: unknown[]) => relFindMany(...a) },
    },
}))
vi.mock('@/lib/agent-visibility', () => ({
    getGrantedPolicyIds: vi.fn(async () => []),
    agentPolicyVisibilityWhere: vi.fn(() => ({})),
}))

import { CustomerResolutionService } from '@/lib/services/customer-resolution.service'

const service = new CustomerResolutionService()

// 123456783 is a valid 9-digit Greek ΑΦΜ (mod-11 checksum passes).
const VALID_AFM = '123456783'
const OTHER_AFM = '090000045' // also valid, different person

const customer = (over: Record<string, unknown> = {}) => ({
    status: 'active',
    customer: {
        id: 'c1',
        name: 'Maria Papadopoulou',
        email: 'maria@example.gr',
        phoneNumber: '+30 210 000 0000',
        taxId: null,
        policiesOwned: [{ id: 'p1' }],
        ...over,
    },
})

beforeEach(() => {
    vi.clearAllMocks()
    relFindMany.mockResolvedValue([])
})

describe('resolveCustomerCandidates', () => {
    it('scopes the query to the agent and excludes inactive/terminated relationships', async () => {
        await service.resolveCustomerCandidates('agent-1', { email: 'x@y.gr' })
        const where = relFindMany.mock.calls[0][0].where
        expect(where.agentUserId).toBe('agent-1')
        expect(where.status).toEqual({ notIn: ['inactive', 'terminated'] })
    })

    it('returns empty without querying when no identity fields are given', async () => {
        const res = await service.resolveCustomerCandidates('agent-1', {})
        expect(res).toEqual({ candidates: [], conflict: false })
        expect(relFindMany).not.toHaveBeenCalled()
    })

    it('treats a valid ΑΦΜ as a strong single match (precedence over email)', async () => {
        relFindMany.mockResolvedValue([
            customer({ id: 'c1', taxId: VALID_AFM, email: 'maria@example.gr' }),
        ])
        const res = await service.resolveCustomerCandidates('agent-1', {
            taxId: VALID_AFM,
            email: 'maria@example.gr',
        })
        expect(res.exactMatch?.id).toBe('c1')
        expect(res.exactMatch?.matchReason).toBe('vat')
        expect(res.conflict).toBe(false)
    })

    it('normalizes a spaced/dotted ΑΦΜ before matching', async () => {
        relFindMany.mockResolvedValue([customer({ id: 'c1', taxId: VALID_AFM })])
        const res = await service.resolveCustomerCandidates('agent-1', { taxId: '12 3.4-5 6783' })
        expect(res.exactMatch?.id).toBe('c1')
        expect(res.exactMatch?.matchReason).toBe('vat')
    })

    it('falls back to an exact email match when there is no ΑΦΜ', async () => {
        relFindMany.mockResolvedValue([
            customer({ id: 'c1', email: 'MARIA@example.gr', taxId: null }),
        ])
        const res = await service.resolveCustomerCandidates('agent-1', { email: 'maria@example.gr' })
        expect(res.exactMatch?.id).toBe('c1')
        expect(res.exactMatch?.matchReason).toBe('email')
    })

    it('flags a conflict and returns candidates when ΑΦΜ and email disagree', async () => {
        relFindMany.mockResolvedValue([
            customer({ id: 'vat-guy', taxId: VALID_AFM, email: 'a@x.gr', name: 'A' }),
            customer({ id: 'email-guy', taxId: null, email: 'target@x.gr', name: 'B' }),
        ])
        const res = await service.resolveCustomerCandidates('agent-1', {
            taxId: VALID_AFM,
            email: 'target@x.gr',
        })
        expect(res.exactMatch).toBeUndefined()
        expect(res.conflict).toBe(true)
        expect(res.candidates.map((c) => c.id).sort()).toEqual(['email-guy', 'vat-guy'])
    })

    it('returns a ranked candidate list (no exactMatch) for multiple name hits', async () => {
        relFindMany.mockResolvedValue([
            customer({ id: 'c1', name: 'Maria Papadopoulou', email: 'm1@x.gr', taxId: null }),
            customer({ id: 'c2', name: 'Maria Papadopoulou', email: 'm2@x.gr', taxId: null }),
        ])
        const res = await service.resolveCustomerCandidates('agent-1', { name: 'Maria Papadopoulou' })
        expect(res.exactMatch).toBeUndefined()
        expect(res.candidates).toHaveLength(2)
        expect(res.candidates.every((c) => c.matchReason === 'name')).toBe(true)
    })

    it('does NOT treat an invalid ΑΦΜ (bad checksum) as a strong match', async () => {
        // 123456789 fails the mod-11 checksum.
        relFindMany.mockResolvedValue([customer({ id: 'c1', taxId: '123456789' })])
        const res = await service.resolveCustomerCandidates('agent-1', { taxId: '123456789' })
        expect(res.exactMatch).toBeUndefined()
        expect(res.candidates).toHaveLength(0)
    })

    it('masks the ΑΦΜ in candidate output', async () => {
        relFindMany.mockResolvedValue([customer({ id: 'c1', taxId: VALID_AFM, email: 'm@x.gr' })])
        const res = await service.resolveCustomerCandidates('agent-1', { email: 'm@x.gr' })
        expect(res.candidates[0].taxIdMasked).toBe('••••••783')
    })
})
