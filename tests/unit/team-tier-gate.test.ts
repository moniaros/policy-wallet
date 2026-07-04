import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        tenant: { create: vi.fn() },
        tenantMembership: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
        user: { findUnique: vi.fn() },
    },
}))
vi.mock('@/lib/notifications', () => ({ sendNotification: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({ resolveAgentEntitlements: vi.fn() }))

import { db } from '@/lib/db'
import { resolveAgentEntitlements } from '@/lib/subscription-entitlements'
import { createAgency, inviteTeamMember } from '@/lib/services/team.service'

const mockMembershipFind = vi.mocked(db.tenantMembership.findFirst)
const mockEntitlements = vi.mocked(resolveAgentEntitlements)
const mockTenantCreate = vi.mocked(db.tenant.create)

beforeEach(() => {
    vi.clearAllMocks()
    mockTenantCreate.mockResolvedValue({ id: 'tenant-1' } as any)
})

describe('agency/team is a plan upgrade (teamMembers entitlement)', () => {
    it('blocks agency creation for solo-seat tiers (agent_free/starter) with UPGRADE_REQUIRED', async () => {
        mockMembershipFind.mockResolvedValue(null)
        mockEntitlements.mockResolvedValue({ tier: 'agent_starter', limits: { teamMembers: 1 } } as any)

        await expect(createAgency('agent-1', { name: 'Solo Agency' })).rejects.toThrow('UPGRADE_REQUIRED')
        expect(mockTenantCreate).not.toHaveBeenCalled()
    })

    it('allows agency creation for team-capable tiers (agent_pro/agency)', async () => {
        mockMembershipFind.mockResolvedValue(null)
        mockEntitlements.mockResolvedValue({ tier: 'agency', limits: { teamMembers: null } } as any)

        const tenant = await createAgency('agent-1', { name: 'Real Agency' })
        expect(tenant).toBeTruthy()
        expect(mockTenantCreate).toHaveBeenCalledTimes(1)
    })

    it("blocks invites beyond the owner's seat entitlement with UPGRADE_REQUIRED", async () => {
        // inviter is an owner; invitee exists as an agent with no team
        mockMembershipFind
            .mockResolvedValueOnce({ tenantId: 't1', role: 'owner', tenant: { name: 'A' } } as any) // inviter membership
            .mockResolvedValueOnce(null) // invitee has no membership
            .mockResolvedValueOnce({ userId: 'agent-1' } as any) // tenant owner lookup
        vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'agent-2', roles: 'agent' } as any)
        mockEntitlements.mockResolvedValue({ tier: 'agent_pro', limits: { teamMembers: 3 } } as any)
        vi.mocked(db.tenantMembership.count).mockResolvedValue(3)

        await expect(inviteTeamMember('agent-1', 'new@agency.gr')).rejects.toThrow('UPGRADE_REQUIRED')
        expect(db.tenantMembership.create).not.toHaveBeenCalled()
    })
})
