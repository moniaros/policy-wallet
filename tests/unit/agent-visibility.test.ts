import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
const relationshipFindMany = vi.fn()
vi.mock('@/lib/db', () => ({
    db: {
        accessGrant: { findMany: (...args: any[]) => findMany(...args) },
        customerRelationship: { findMany: (...args: any[]) => relationshipFindMany(...args) },
    },
}))

import {
    agentPolicyVisibilityWhere,
    getAgentPolicyVisibilityWhere,
    getGrantedPolicyIds,
    getLiveCustomerUserIds,
    isPolicyVisibleToAgent,
} from '@/lib/agent-visibility'

beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
    relationshipFindMany.mockReset()
    relationshipFindMany.mockResolvedValue([])
})

/** The upload arm, as the fragment now expresses it. */
const uploadArm = (agentUserId: string) => ({
    createdByUserId: agentUserId,
    owner: {
        customerRelationshipsAsCustomer: {
            some: {
                agentUserId,
                status: { notIn: ['inactive', 'terminated'] },
            },
        },
    },
})

describe('agent policy visibility', () => {
    it('without grants, an agent sees ONLY policies they uploaded for a live customer', async () => {
        const where = await getAgentPolicyVisibilityWhere('agent_1')
        expect(where).toEqual({ OR: [uploadArm('agent_1')] })
    })

    it('adds explicitly granted policies (owner shared THAT policy)', () => {
        expect(agentPolicyVisibilityWhere('agent_1', ['pol_9'])).toEqual({
            OR: [uploadArm('agent_1'), { id: { in: ['pol_9'] } }],
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

    it('counts a customer as live unless the relationship ended', async () => {
        relationshipFindMany.mockResolvedValue([{ policyholderUserId: 'customer_1' }])
        await expect(getLiveCustomerUserIds('agent_1')).resolves.toEqual(new Set(['customer_1']))
        expect(relationshipFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    agentUserId: 'agent_1',
                    // pending_activation must NOT be excluded: it is the normal
                    // state before a customer accepts, and the agent still has
                    // to see the policy they just uploaded for them.
                    status: { notIn: ['inactive', 'terminated'] },
                },
            })
        )
    })

    // THE PRIVACY RULE: a self-uploaded policy stays invisible to the agent,
    // no matter what relationship the agent created.
    it('a policy the policyholder uploaded is invisible without a grant', () => {
        const selfUploaded = { id: 'pol_1', createdByUserId: 'customer_1', ownerUserId: 'customer_1' }
        const live = new Set(['customer_1'])
        expect(isPolicyVisibleToAgent(selfUploaded, 'agent_1', new Set(), live)).toBe(false)
        expect(isPolicyVisibleToAgent(selfUploaded, 'agent_1', new Set(['pol_1']), live)).toBe(true)
    })

    it("the agent's own upload is visible while the relationship lives", () => {
        const uploaded = { id: 'pol_2', createdByUserId: 'agent_1', ownerUserId: 'customer_1' }
        expect(
            isPolicyVisibleToAgent(uploaded, 'agent_1', new Set(), new Set(['customer_1']))
        ).toBe(true)
    })

    // THE REGRESSION THIS FILE EXISTS FOR.
    //
    // Terminating a relationship revokes the grants, but it cannot revoke
    // Policy.createdByUserId — that is immutable history. The upload arm used
    // to match on createdByUserId alone, so a dismissed agent kept seeing every
    // policy they had ever uploaded for that customer, for ever, including the
    // branded report that serves the analysis itself.
    it('a dismissed agent loses sight of the policies they uploaded', () => {
        const uploaded = { id: 'pol_2', createdByUserId: 'agent_1', ownerUserId: 'customer_1' }
        // Relationship terminated => customer_1 is no longer in the live set.
        expect(isPolicyVisibleToAgent(uploaded, 'agent_1', new Set(), new Set())).toBe(false)
    })

    it('an explicit grant still wins after termination, until it is revoked too', () => {
        // Termination revokes grants in practice; this pins the ordering rather
        // than the policy — a surviving grant is an intentional, revocable act.
        const uploaded = { id: 'pol_2', createdByUserId: 'agent_1', ownerUserId: 'customer_1' }
        expect(isPolicyVisibleToAgent(uploaded, 'agent_1', new Set(['pol_2']), new Set())).toBe(true)
    })
})
