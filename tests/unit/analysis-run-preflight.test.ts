import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: { gapDefinition: { count: vi.fn() } },
}))
vi.mock('@/lib/token-tracking', () => ({
    canUserUseTokens: vi.fn(),
}))

import { db } from '@/lib/db'
import { canUserUseTokens } from '@/lib/token-tracking'
import { estimatePolicyAnalysisTokenBudget } from '@/lib/services/analysis/token-budget-estimator'
import { INSURANCE_CLARITY_CHECKLIST } from '@/lib/services/analysis/insurance-clarity-checklist'
import { estimateAnalysisRunBudget, preflightAnalysisTokenGate } from '@/lib/services/analysis/run-preflight'
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'

/**
 * H1 — the pre-flight the agent upload runs BEFORE it answers is the SAME
 * estimate the orchestrator's createRun would refuse on. Pinned here, plus
 * the fact that made the modal lie: a document run on the free agent tier
 * estimates above the tier's whole monthly budget, so the gate blocks at
 * zero usage — every time.
 */
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.gapDefinition.count).mockResolvedValue(7)
})

describe('estimateAnalysisRunBudget', () => {
    it('counts the ACTIVE definitions of the normalised branch and estimates exactly as createRun does', async () => {
        const budget = await estimateAnalysisRunBudget({ lineOfBusiness: 'auto', hasDocument: true })

        expect(db.gapDefinition.count).toHaveBeenCalledWith({
            where: { lineOfBusiness: { equals: 'motor', mode: 'insensitive' }, isActive: true },
        })
        expect(budget.gapDefinitionsCount).toBe(7)
        expect(budget.totalEstimatedTokens).toBe(
            estimatePolicyAnalysisTokenBudget({
                hasDocument: true,
                gapDefinitionsCount: 7,
                checklistPillarsCount: INSURANCE_CLARITY_CHECKLIST.length,
            }).totalEstimatedTokens
        )
    })

    it('a document run costs more than the free agent tier holds in a month — the gate cannot pass there', async () => {
        const budget = await estimateAnalysisRunBudget({ lineOfBusiness: 'motor', hasDocument: true })
        expect(budget.totalEstimatedTokens).toBeGreaterThan(DEFAULT_AGENT_ENTITLEMENT_LIMITS.agent_free.monthlyTokenBudget!)
    })
})

describe('preflightAnalysisTokenGate', () => {
    it('asks the token gate for the estimated total and reports allowed', async () => {
        vi.mocked(canUserUseTokens).mockResolvedValue({ allowed: true, remainingTokens: 900_000 } as any)

        const verdict = await preflightAnalysisTokenGate('agent-1', { lineOfBusiness: 'motor', hasDocument: true })

        expect(verdict.allowed).toBe(true)
        expect(canUserUseTokens).toHaveBeenCalledWith('agent-1', verdict.estimatedTokens)
    })

    it('reports the gate reason when refused, without reserving anything', async () => {
        vi.mocked(canUserUseTokens).mockResolvedValue({ allowed: false, reason: 'monthly_limit_reached', remainingTokens: 0 } as any)

        const verdict = await preflightAnalysisTokenGate('agent-1', { lineOfBusiness: 'motor', hasDocument: true })

        expect(verdict).toMatchObject({ allowed: false, reason: 'monthly_limit_reached' })
    })
})
