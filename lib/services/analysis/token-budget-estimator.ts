export type PolicyAnalysisStepKey =
    | "document_load_and_validation"
    | "metadata_extraction_and_verification"
    | "plain_language_translation"
    | "coverage_mapping"
    | "gap_detection"
    | "savings_detection"
    | "checklist_scoring_and_actions"
    | "persistence_and_finalize"

const SAFETY_BUFFER = 1.2

type EstimateInput = {
    hasDocument: boolean
    gapDefinitionsCount: number
    checklistPillarsCount: number
}

export function estimatePolicyAnalysisTokenBudget(input: EstimateInput): {
    totalEstimatedTokens: number
    byStep: Record<PolicyAnalysisStepKey, number>
} {
    const gapFactor = Math.max(input.gapDefinitionsCount, 1)
    const checklistFactor = Math.max(input.checklistPillarsCount, 1)

    const raw: Record<PolicyAnalysisStepKey, number> = {
        document_load_and_validation: 1_000,
        metadata_extraction_and_verification: input.hasDocument ? 85_000 : 20_000,
        plain_language_translation: input.hasDocument ? 70_000 : 25_000,
        coverage_mapping: 8_000,
        gap_detection: 25_000 + gapFactor * 1_500,
        savings_detection: 10_000 + checklistFactor * 1_000,
        checklist_scoring_and_actions: 8_000 + checklistFactor * 500,
        persistence_and_finalize: 2_000,
    }

    const byStep = Object.fromEntries(
        Object.entries(raw).map(([step, value]) => [step, Math.ceil(value * SAFETY_BUFFER)])
    ) as Record<PolicyAnalysisStepKey, number>

    const totalEstimatedTokens = Object.values(byStep).reduce((sum, value) => sum + value, 0)
    return { totalEstimatedTokens, byStep }
}

