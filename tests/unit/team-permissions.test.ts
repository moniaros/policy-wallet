import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        tenantMembership: { findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
        customerRelationship: { findUnique: vi.fn(), update: vi.fn() },
        opportunity: { updateMany: vi.fn() },
    },
}))
vi.mock('@/lib/notifications', () => ({ sendNotification: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({ resolveAgentEntitlements: vi.fn() }))

import { db } from '@/lib/db'
import { removeTeamMember, updateMemberRole } from '@/lib/services/team.service'

const find = vi.mocked(db.tenantMembership.findFirst)
const del = vi.mocked(db.tenantMembership.delete)
const upd = vi.mocked(db.tenantMembership.update)

const membership = (role: string, over: Record<string, unknown> = {}) => ({
    id: `m-${role}`, tenantId: 't1', userId: `u-${role}`, role, status: 'active', ...over,
})

beforeEach(() => vi.clearAllMocks())

/**
 * Team management is a permissions matrix; these are the least-privilege and
 * tenant-isolation invariants — verified by reading, now pinned so a refactor
 * cannot silently open privilege escalation or cross-tenant access.
 */
describe('removeTeamMember — least privilege', () => {
    it('a member cannot remove anyone', async () => {
        find
            .mockResolvedValueOnce(membership('member', { userId: 'me' }) as any) // requester
            .mockResolvedValueOnce(membership('member', { userId: 'them' }) as any) // target
        await expect(removeTeamMember('me', 'them')).rejects.toThrow(/cannot remove/i)
        expect(del).not.toHaveBeenCalled()
    })

    it('nobody can remove the owner', async () => {
        find
            .mockResolvedValueOnce(membership('manager', { userId: 'me' }) as any)
            .mockResolvedValueOnce(membership('owner', { userId: 'boss' }) as any)
        await expect(removeTeamMember('me', 'boss')).rejects.toThrow(/owner/i)
        expect(del).not.toHaveBeenCalled()
    })

    it('a manager cannot remove another manager', async () => {
        find
            .mockResolvedValueOnce(membership('manager', { userId: 'me' }) as any)
            .mockResolvedValueOnce(membership('manager', { userId: 'peer' }) as any)
        await expect(removeTeamMember('me', 'peer')).rejects.toThrow(/managers cannot remove/i)
        expect(del).not.toHaveBeenCalled()
    })

    it('a manager CAN remove a member of the same team', async () => {
        find
            .mockResolvedValueOnce(membership('manager', { userId: 'me' }) as any)
            .mockResolvedValueOnce(membership('member', { userId: 'junior' }) as any)
        const r = await removeTeamMember('me', 'junior')
        expect(r).toEqual({ success: true })
        expect(del).toHaveBeenCalledTimes(1)
    })

    it('the target is scoped to the requester’s tenant (no cross-tenant removal)', async () => {
        find.mockResolvedValueOnce(membership('owner', { userId: 'me', tenantId: 't1' }) as any)
        find.mockResolvedValueOnce(null as any) // no member with that id IN t1
        await expect(removeTeamMember('me', 'stranger')).rejects.toThrow(/not in your team/i)
        // The target lookup must filter by the requester's tenant.
        expect(find.mock.calls[1][0]).toMatchObject({ where: { tenantId: 't1' } })
    })
})

describe('updateMemberRole — only the owner, no escalation to owner', () => {
    it('a manager cannot change roles', async () => {
        find.mockResolvedValueOnce(membership('manager', { userId: 'me' }) as any)
        await expect(updateMemberRole('me', 'x', 'manager')).rejects.toThrow(/only the owner/i)
        expect(upd).not.toHaveBeenCalled()
    })

    it('nobody can assign the owner role (no escalation)', async () => {
        // The owner-role guard must reject up front, before ANY membership lookup —
        // otherwise a caller who happens to be the owner could self-assign owner to
        // someone. Assert the DB is never touched, not just that it throws.
        await expect(updateMemberRole('me', 'x', 'owner' as any)).rejects.toThrow('Cannot assign owner role')
        expect(find).not.toHaveBeenCalled()
        expect(upd).not.toHaveBeenCalled()
    })

    it('the owner cannot have their own role changed away', async () => {
        find
            .mockResolvedValueOnce(membership('owner', { userId: 'me' }) as any)
            .mockResolvedValueOnce(membership('owner', { userId: 'me' }) as any)
        await expect(updateMemberRole('me', 'me', 'manager')).rejects.toThrow(/owner/i)
        expect(upd).not.toHaveBeenCalled()
    })

    it('the owner CAN promote a member to manager', async () => {
        find
            .mockResolvedValueOnce(membership('owner', { userId: 'me' }) as any)
            .mockResolvedValueOnce(membership('member', { userId: 'junior' }) as any)
        const r = await updateMemberRole('me', 'junior', 'manager')
        expect(r).toEqual({ success: true })
        expect(upd).toHaveBeenCalledWith(expect.objectContaining({ data: { role: 'manager' } }))
    })
})
