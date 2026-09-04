import { DEFAULT_AGENT_ENTITLEMENT_LIMITS, DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
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
    canAgentAddCustomer,
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

describe('canAgentAddCustomer — maxCustomers', () => {
    it('does not count terminated relationships against the seat', async () => {
        // A terminated relationship has left the book (getCustomers hides it,
        // visibility is closed) — it used to keep occupying a plan seat, so an
        // agent who had parted ways with customers could not add new ones.
        mockAgentPlan(null) // agent_free has a finite maxCustomers
        vi.mocked(db.customerRelationship.count).mockResolvedValue(0)

        await canAgentAddCustomer(AGENT)

        expect(db.customerRelationship.count).toHaveBeenCalledWith({
            where: { agentUserId: AGENT, status: { not: 'terminated' } },
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
        expect(result.remainingTokens).toBe(DEFAULT_AGENT_ENTITLEMENT_LIMITS.agent_starter.monthlyTokenBudget)
    })

    it('agent without a paid plan gets the agent_free budget, NOT the B2C one', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ roles: 'agent' } as any)
        mockAgentPlan(null)
        vi.mocked(db.monthlyTokenUsage.findUnique).mockResolvedValue(null)

        const result = await canUserUseTokens(AGENT, 100_000)
        expect(result.allowed).toBe(true)
        expect(result.remainingTokens).toBe(DEFAULT_AGENT_ENTITLEMENT_LIMITS.agent_free.monthlyTokenBudget)
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

    it('non-agent policyholders draw on the B2C free budget, not the agent one', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ roles: 'policyholder' } as any)
        vi.mocked(db.subscription.findFirst).mockResolvedValue(null)
        vi.mocked(db.monthlyTokenUsage.findUnique).mockResolvedValue(null)

        // Pricing v2 gave the free tier a real (small) budget, so the
        // assertion is no longer "zero" — it is "the B2C number, never the
        // agent number". A policyholder resolving onto an agent budget is the
        // bug this test exists to catch.
        const freeBudget = DEFAULT_ENTITLEMENT_LIMITS.free.monthlyTokenBudget!
        expect(freeBudget).toBeLessThan(DEFAULT_AGENT_ENTITLEMENT_LIMITS.agent_starter.monthlyTokenBudget!)

        const withinFree = await canUserUseTokens(CUSTOMER, Math.floor(freeBudget / 2))
        expect(withinFree.allowed).toBe(true)

        const result = await canUserUseTokens(CUSTOMER, freeBudget + 1)
        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('monthly_limit_reached')
    })
})
