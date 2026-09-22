import { expect, it } from 'vitest'
import { estimatePolicyAnalysisTokenBudget } from '@/lib/services/analysis/token-budget-estimator'
it('requires token headroom only for provider-backed work', () => {
    const result = estimatePolicyAnalysisTokenBudget({ hasDocument: true, gapDefinitionsCount: 5, checklistPillarsCount: 999 })
    expect(result.totalEstimatedTokens).toBe(Math.ceil((85000 + 18000 + 20000) * 1.2))
    for (const step of ['document_load_and_validation', 'coverage_mapping', 'savings_detection', 'checklist_scoring_and_actions', 'persistence_and_finalize'] as const) expect(result.byStep[step]).toBe(0)
})
