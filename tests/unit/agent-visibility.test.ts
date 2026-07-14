import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
vi.mock('@/lib/db', () => ({
    db: { accessGrant: { findMany: (...args: any[]) => findMany(...args) } },
}))

import {
    agentPolicyVisibilityWhere,
    getAgentPolicyVisibilityWhere,
    getGrantedPolicyIds,
    isPolicyVisibleToAgent,
} from '@/lib/agent-visibility'

beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
})

describe('agent policy visibility', () => {
    it('without grants, an agent sees ONLY the policies they uploaded', async () => {
        const where = await getAgentPolicyVisibilityWhere('agent_1')
        expect(where).toEqual({ OR: [{ createdByUserId: 'agent_1' }] })
    })

    it('adds explicitly granted policies (owner shared THAT policy)', () => {
        expect(agentPolicyVisibilityWhere('agent_1', ['pol_9'])).toEqual({
            OR: [{ createdByUserId: 'agent_1' }, { id: { in: ['pol_9'] } }],
        })
    })

    it('reads policy ids out of the policy-scoped grants only', async () => {
        findMany.mockResolvedValue([{ scope: 'policy:pol_9' }, { scope: 'policy:pol_10' }])
        await expect(getGrantedPolicyIds('agent_1')).resolves.toEqual(['pol_9', 'pol_10'])
        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    granteeUserId: 'agent_1',
                    status: 'active',
                    scope: { startsWith: 'policy:' },
                }),
            })
        )
    })

    // THE PRIVACY RULE: a self-uploaded policy stays invisible to the agent,
    // no matter what relationship the agent created.
    it('a policy the policyholder uploaded is invisible without a grant', () => {
        const selfUploaded = { id: 'pol_1', createdByUserId: 'customer_1' }
        expect(isPolicyVisibleToAgent(selfUploaded, 'agent_1', new Set())).toBe(false)
        expect(isPolicyVisibleToAgent(selfUploaded, 'agent_1', new Set(['pol_1']))).toBe(true)
    })

    it("the agent's own upload is always visible to them", () => {
        expect(
            isPolicyVisibleToAgent({ id: 'pol_2', createdByUserId: 'agent_1' }, 'agent_1', new Set())
        ).toBe(true)
    })
})
