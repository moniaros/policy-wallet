import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ find: vi.fn(), list: vi.fn(), access: vi.fn(), visible: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { collaborationThread: { findUnique: mocks.find, findMany: mocks.list } } }))
vi.mock('@/lib/policy-access', () => ({ getPolicyAccess: mocks.access }))
vi.mock('@/lib/agent-visibility', () => ({ ENDED_RELATIONSHIP_STATUSES: ['inactive', 'terminated'], getAgentPolicyVisibilityWhere: mocks.visible }))
import { collaborationService } from '@/lib/services/collaboration.service'
const thread = { id: 'thread', policyId: 'policy', relationship: { agentUserId: 'agent', policyholderUserId: 'customer', status: 'active' }, participants: [{ userId: 'agent' }] }
beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue(thread); mocks.access.mockResolvedValue({ canRead: true }); mocks.list.mockResolvedValue([]); mocks.visible.mockResolvedValue({ id: { in: ['visible-policy'] } }) })
it.each(['inactive', 'terminated'])('refuses the former agent even with a participant record: %s', async status => {
    mocks.find.mockResolvedValue({ ...thread, relationship: { ...thread.relationship, status } })
    expect(await collaborationService.assertThreadAccess('agent', 'agent', 'thread')).toBeNull()
    expect(mocks.access).not.toHaveBeenCalled()
})
it('refuses policy threads after the policy grant is withdrawn', async () => {
    mocks.access.mockResolvedValue({ canRead: false })
    expect(await collaborationService.assertThreadAccess('agent', 'agent', 'thread')).toBeNull()
    expect(mocks.access).toHaveBeenCalledWith('policy', { id: 'agent', roles: 'agent' })
})
it('preserves the customer’s own historical conversation', async () => {
    mocks.find.mockResolvedValue({ ...thread, relationship: { ...thread.relationship, status: 'terminated' } })
    expect(await collaborationService.assertThreadAccess('customer', 'policyholder', 'thread')).not.toBeNull()
})
it('scopes list previews before querying bodies, including participants', async () => {
    await collaborationService.listThreads('agent', 'agent', {})
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: [{ OR: [{ relationship: { policyholderUserId: 'agent' } }, { relationship: { status: { notIn: ['inactive', 'terminated'] } }, OR: [{ policyId: null }, { policy: { id: { in: ['visible-policy'] } } }] }] }] }) }))
})
