// ── B2C Policyholder Tiers ────────────────────────────────────────────
export type PlanTier = "free" | "plus" | "pro"

// ── B2B Agent Tiers ──────────────────────────────────────────────────
export type AgentTier = "agent_free" | "agent_starter" | "agent_pro" | "agency"

// ── Union type for all tiers ─────────────────────────────────────────
export type AnyTier = PlanTier | AgentTier

export type UpgradeReason =
    | "policy_limit"
    | "daily_questions_limit"
    | "gap_analysis_limit"
    | "feature_locked"
    | "notifications_disabled"
    | "customer_limit"
    | "ai_analysis_limit"
    | "questionnaire_template_limit"

// ── B2C Entitlements ─────────────────────────────────────────────────
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

// ── B2B Agent Entitlements ───────────────────────────────────────────
export interface AgentEntitlementLimits {
    /** Maximum number of customer relationships */
    maxCustomers: number | null
    /** Max policies per customer (null = unlimited) */
    maxPoliciesPerCustomer: number | null
    /** AI analyses per month */
    aiAnalysesPerMonth: number | null
    /** Monthly token budget */
    monthlyTokenBudget: number | null
    /** Collaboration threads */
    collaborationThreads: boolean
    /** Max questionnaire templates */
    questionnaireTemplates: number | null
    /** Branded invite emails and agent card */
    brandedPortal: boolean
    /** Revenue pipeline analytics */
    pipelineAnalytics: boolean
    /** Automated renewal detection + actions */
    renewalAutomation: boolean
    /** Commission tracking and reporting */
    commissionTracking: boolean
    /** Bulk CSV import limit (rows per upload) */
    bulkImportLimit: number | null
    /** REST API access */
    apiAccess: boolean
    /** Multi-agent team features */
    teamMembers: number | null
    /** Portfolio gap view across customers */
    portfolioGapView: boolean
    /** Historical analysis comparison */
    analysisComparison: boolean
    /** Savings report export */
    savingsReportExport: boolean
    /** Agent-branded, print-ready policy report (Pro+) */
    brandedReport: boolean
    /** Priority analysis queue */
    priorityQueue: boolean
    /** Cross-sell / upsell intelligence */
    crossSellIntelligence: boolean
    /** Proposal creation and sending */
    proposalFlow: boolean
    /** Document request flow */
    documentRequestFlow: boolean
    /** Shared policy room workspace */
    sharedPolicyRoom: boolean
    /** Async messaging threads */
    asyncMessaging: boolean
    /** Private agent-only notes on threads */
    privateNotes: boolean
}

// ── Entitlement result types ─────────────────────────────────────────
export interface UserEntitlements {
    tier: PlanTier
    status: string
    isPaid: boolean
    limits: EntitlementLimits
}

export interface AgentEntitlements {
    tier: AgentTier
    status: string
    isPaid: boolean
    limits: AgentEntitlementLimits
}
