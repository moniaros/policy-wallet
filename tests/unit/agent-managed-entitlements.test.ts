import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: vi.fn() },
        subscription: { findFirst: vi.fn() },
        policy: { count: vi.fn() },
        customerRelationship: { count: vi.fn() },
        policyAnalysisRun: { count: vi.fn() },
        monthlyTokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
        tokenBalance: { findUnique: vi.fn() },
    },
}))

import { db } from '@/lib/db'
import {
    canAgentAddPolicyForCustomer,
    canAgentRunAnalysis,
} from '@/lib/subscription-entitlements'
import { canUserUseTokens } from '@/lib/token-tracking'

const AGENT = 'agent_1'
const CUSTOMER = 'customer_1'

function mockAgentPlan(planName: string | null) {
    // resolveAgentEntitlements + resolveTokenBudget both read the latest
    // subscription with its plan.
    vi.mocked(db.subscription.findFirst).mockResolvedValue(
        planName
            ? ({ status: 'active', plan: { name: planName, planType: 'agent' } } as any)
            : null
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('canAgentAddPolicyForCustomer — maxPoliciesPerCustomer', () => {
    it('blocks the 6th policy on agent_free (limit 5)', async () => {
        mockAgentPlan(null) // no agent subscription -> agent_free fallback
        vi.mocked(db.policy.count).mockResolvedValue(5)

        const result = await canAgentAddPolicyForCustomer(AGENT, CUSTOMER)
        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('policy_per_customer_limit')
        expect(result.current).toBe(5)
        expect(result.limit).toBe(5)
    })

    it('allows under the limit and reports usage', async () => {
        mockAgentPlan(null)
        vi.mocked(db.policy.count).mockResolvedValue(2)

        const result = await canAgentAddPolicyForCustomer(AGENT, CUSTOMER)
        expect(result.allowed).toBe(true)
        expect(result.current).toBe(2)
    })

    it('is unlimited on agent_pro (maxPoliciesPerCustomer null)', async () => {
        mockAgentPlan('agent_pro')

        const result = await canAgentAddPolicyForCustomer(AGENT, CUSTOMER)
        expect(result.allowed).toBe(true)
        expect(db.policy.count).not.toHaveBeenCalled()
    })

    it('counts only this agent\'s non-deleted policies for this customer', async () => {
        mockAgentPlan(null)
        vi.mocked(db.policy.count).mockResolvedValue(0)

        await canAgentAddPolicyForCustomer(AGENT, CUSTOMER)
        expect(db.policy.count).toHaveBeenCalledWith({
            where: {
                ownerUserId: CUSTOMER,
                createdByUserId: AGENT,
                status: { not: 'deleted' },
            },
        })
    })
})

describe('canAgentRunAnalysis — counts runs by INITIATOR', () => {
    it('queries policyAnalysisRun by userId, not policy creator', async () => {
        mockAgentPlan(null)
        vi.mocked(db.policyAnalysisRun.count).mockResolvedValue(0)

        await canAgentRunAnalysis(AGENT)
        const arg = vi.mocked(db.policyAnalysisRun.count).mock.calls[0][0] as any
        expect(arg.where.userId).toBe(AGENT)
        expect(arg.where.policy).toBeUndefined()
    })

    it('blocks at the tier limit', async () => {
        mockAgentPlan(null) // agent_free: 5 analyses/month
        vi.mocked(db.policyAnalysisRun.count).mockResolvedValue(5)

        const result = await canAgentRunAnalysis(AGENT)
        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('ai_analysis_limit')
    })
})

describe('canUserUseTokens — agent budget branch', () => {
    it('agents draw on the agent-plan monthlyTokenBudget (agent_starter = 2M)', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ roles: 'agent' } as any)
        mockAgentPlan('agent_starter')
        vi.mocked(db.monthlyTokenUsage.findUnique).mockResolvedValue(null)

        const result = await canUserUseTokens(AGENT, 100_000)
        expect(result.allowed).toBe(true)
        expect(result.remainingTokens).toBe(2_000_000)
    })

    it('agent without a paid plan gets the agent_free budget (500k), NOT the B2C zero budget', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ roles: 'agent' } as any)
        mockAgentPlan(null)
        vi.mocked(db.monthlyTokenUsage.findUnique).mockResolvedValue(null)

        const result = await canUserUseTokens(AGENT, 100_000)
        expect(result.allowed).toBe(true)
        expect(result.remainingTokens).toBe(500_000)
    })

    it('agent over budget falls through to purchased tokens', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ roles: 'agent' } as any)
        mockAgentPlan(null)
        vi.mocked(db.monthlyTokenUsage.findUnique).mockResolvedValue({
            totalTokens: BigInt(500_000),
            reservedTokens: BigInt(0),
        } as any)
        vi.mocked(db.tokenBalance.findUnique).mockResolvedValue(null)

        const result = await canUserUseTokens(AGENT, 100_000)
        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('insufficient_tokens')
    })

    it('non-agent policyholders keep the B2C free zero budget', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ roles: 'policyholder' } as any)
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)
        vi.mocked(db.monthlyTokenUsage.findUnique).mockResolvedValue(null)

        const result = await canUserUseTokens(CUSTOMER, 100_000)
        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('monthly_limit_reached')
    })
})
