/**
 * Relationship termination (owner decision #2, 2026-07-21 GDPR review):
 * either side can end an agent↔customer relationship. It must be a status
 * flip + mutual grant revocation (never data deletion), strictly scoped to
 * the actor's own side — agent A must not be able to terminate agent B's
 * relationship, nor a customer someone else's.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const relationshipFindFirst = vi.fn()
const relationshipUpdate = vi.fn(async (_a?: any) => ({}))
const grantUpdateMany = vi.fn(async (_a?: any) => ({ count: 2 }))
const activityCreate = vi.fn(async (_a?: any) => ({}))
const getAuthenticatedUserOrNull = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        customerRelationship: {
            findFirst: (...a: unknown[]) => relationshipFindFirst(...a),
            update: (...a: unknown[]) => (relationshipUpdate as any)(...a),
        },
        accessGrant: { updateMany: (...a: unknown[]) => (grantUpdateMany as any)(...a) },
        activityLog: { create: (...a: unknown[]) => (activityCreate as any)(...a) },
        $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    },
}))
vi.mock('@/lib/auth-helpers', () => ({
    getAuthenticatedUserOrNull: (...a: unknown[]) => getAuthenticatedUserOrNull(...a),
    getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { db } from '@/lib/db'
import { terminateRelationshipAsAgent, disconnectFromAgent } from '@/app/(protected)/agent/relationship-actions'

const REL = {
    id: 'rel-1',
    status: 'active',
    agentUserId: 'agent-1',
    policyholderUserId: 'client-1',
}

beforeEach(() => {
    vi.clearAllMocks()
    relationshipFindFirst.mockResolvedValue({ ...REL })
})

describe('terminateRelationshipAsAgent', () => {
    it('is scoped to the acting agent in the where clause', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: 'agent-1' } })

        const result = await terminateRelationshipAsAgent('rel-1')

        expect(result.success).toBe(true)
        expect(relationshipFindFirst.mock.calls[0]![0].where).toMatchObject({
            id: 'rel-1',
            agentUserId: 'agent-1',
        })
        expect((relationshipUpdate.mock.calls[0]![0] as any).data).toEqual({ status: 'terminated' })
    })

    it('revokes active grants in BOTH directions', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: 'agent-1' } })

        await terminateRelationshipAsAgent('rel-1')

        const where = (grantUpdateMany.mock.calls[0]![0] as any).where
        expect(where.status).toBe('active')
        expect(where.OR).toEqual([
            { granterUserId: 'client-1', granteeUserId: 'agent-1' },
            { granterUserId: 'agent-1', granteeUserId: 'client-1' },
        ])
        expect((grantUpdateMany.mock.calls[0]![0] as any).data.status).toBe('revoked')
    })

    it('another agent gets NOT_FOUND, nothing written', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: 'agent-2' } })
        relationshipFindFirst.mockResolvedValue(null) // scoped query misses

        const result = await terminateRelationshipAsAgent('rel-1')

        expect(result).toEqual({ success: false, error: 'NOT_FOUND' })
        expect(relationshipUpdate).not.toHaveBeenCalled()
        expect(grantUpdateMany).not.toHaveBeenCalled()
    })

    it('is idempotent on an already-terminated relationship', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: 'agent-1' } })
        relationshipFindFirst.mockResolvedValue({ ...REL, status: 'terminated' })

        const result = await terminateRelationshipAsAgent('rel-1')

        expect(result.success).toBe(true)
        expect(relationshipUpdate).not.toHaveBeenCalled()
    })
})

describe('disconnectFromAgent', () => {
    it('is scoped to the acting policyholder', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: 'client-1' } })

        const result = await disconnectFromAgent('rel-1')

        expect(result.success).toBe(true)
        expect(relationshipFindFirst.mock.calls[0]![0].where).toMatchObject({
            id: 'rel-1',
            policyholderUserId: 'client-1',
        })
    })

    it('rejects anonymous callers', async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(null)

        const result = await disconnectFromAgent('rel-1')

        expect(result).toEqual({ success: false, error: 'UNAUTHORIZED' })
        expect(relationshipFindFirst).not.toHaveBeenCalled()
    })
})
