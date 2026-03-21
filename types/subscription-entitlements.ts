export type PlanTier = "free" | "plus" | "pro"

export type UpgradeReason =
    | "policy_limit"
    | "daily_questions_limit"
    | "gap_analysis_limit"
    | "feature_locked"
    | "notifications_disabled"

export interface EntitlementLimits {
    policies: number | null
    aiAnalysisPerMonth: number | null
    questionsPerDay: number | null
    gapAnalysisPerDay: number | null
    notifications: boolean
    advancedAnalytics: boolean
    agentCollaboration: boolean
    interactiveQA: boolean
    /** Historical comparison between analysis runs (Plus+) */
    analysisComparison: boolean
    /** Cross-policy portfolio gap view (Plus+) */
    portfolioGapView: boolean
    /** Priority analysis queue (Pro only) */
    priorityQueue: boolean
    /** Savings report PDF export (Pro only) */
    savingsReportExport: boolean
}

export interface UserEntitlements {
    tier: PlanTier
    status: string
    isPaid: boolean
    limits: EntitlementLimits
}
