/**
 * Plan-catalog fallback constants — the code-side source of truth the DB
 * catalog merges over.
 *
 * CLIENT-SAFE: no server imports (no db, no stripe, no next/*). These values
 * are what the product falls back to whenever a DB plan row is missing or its
 * entitlements JSON fails validation (lib/pricing/plan-catalog.ts), so a bad
 * admin edit can never brick gating. They must stay in sync with
 * prisma/plan-seed-data.ts (enforced by tests/unit/plan-catalog.test.ts).
 *
 * Live values are DB rows edited via /admin/plans; do NOT edit prices here to
 * change what users see — this file only moves when the seeded baseline moves.
 */

import type {
    AgentEntitlementLimits,
    AgentTier,
    EntitlementLimits,
    PlanTier,
} from "@/types/subscription-entitlements"

// ── Tier identity ────────────────────────────────────────────────────

export type TierKey = PlanTier | AgentTier

export const B2C_TIER_KEYS: readonly PlanTier[] = ["free", "plus", "pro"]
export const AGENT_TIER_KEYS: readonly AgentTier[] = [
    "agent_free",
    "agent_starter",
    "agent_pro",
    "agency",
]
export const TIER_KEYS: readonly TierKey[] = [...B2C_TIER_KEYS, ...AGENT_TIER_KEYS]

export function isB2cTierKey(value: string | null | undefined): value is PlanTier {
    return !!value && (B2C_TIER_KEYS as readonly string[]).includes(value)
}
export function isAgentTierKey(value: string | null | undefined): value is AgentTier {
    return !!value && (AGENT_TIER_KEYS as readonly string[]).includes(value)
}

/** Canonical (seeded) plan id per tier — the row /admin/plans edits. */
export const PLAN_ID_BY_TIER_KEY: Record<TierKey, string> = {
    free: "ph-free",
    plus: "ph-plus",
    pro: "ph-pro",
    agent_free: "agent-free",
    agent_starter: "agent-starter",
    agent_pro: "agent-pro",
    agency: "agent-agency",
}

// ── B2C entitlement fallbacks ────────────────────────────────────────

export const DEFAULT_ENTITLEMENT_LIMITS: Record<PlanTier, EntitlementLimits> = {
    // Free = organizer only. One policy, its basic parsed summary, and basic
    // renewal reminders — NO paid AI at all (parse/extraction is the entry,
    // deep analysis/Q&A/gaps require Plus). There is no complimentary deep
    // "trial analysis"; the paid-aha-loop model gates all deep AI to Plus.
    free: {
        policies: 1,
        aiAnalysisPerMonth: 0,
        questionsPerDay: 0,
        gapAnalysisPerDay: 0,
        monthlyTokenBudget: 0,
        notifications: false,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: false,
        analysisComparison: false,
        portfolioGapView: false,
        priorityQueue: false,
        savingsReportExport: false,
    },
    // "Starter" (displayed) = €2.99 organizer + basic renewal reminders, still
    // NO deep AI. More policies than Free, but every AI-cost feature stays off
    // so it can't cannibalise Plus. (Code key stays `plus`.)
    plus: {
        policies: 5,
        aiAnalysisPerMonth: 0,
        questionsPerDay: 0,
        gapAnalysisPerDay: 0,
        monthlyTokenBudget: 0,
        notifications: true,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: false,
        analysisComparison: false,
        portfolioGapView: false,
        priorityQueue: false,
        savingsReportExport: false,
    },
    // "Plus" (displayed) = €7.99, the AI tier: unlimited everything, with the
    // token budget as the real backstop meter.
    pro: {
        policies: null,
        aiAnalysisPerMonth: null,
        questionsPerDay: null,
        gapAnalysisPerDay: null,
        monthlyTokenBudget: 3_000_000,
        notifications: true,
        advancedAnalytics: true,
        agentCollaboration: true,
        interactiveQA: true,
        analysisComparison: true,
        portfolioGapView: true,
        priorityQueue: true,
        savingsReportExport: true,
    },
}

// ── Agent entitlement fallbacks ──────────────────────────────────────

export const DEFAULT_AGENT_ENTITLEMENT_LIMITS: Record<AgentTier, AgentEntitlementLimits> = {
    agent_free: {
        maxCustomers: 10,
        maxPoliciesPerCustomer: 5,
        aiAnalysesPerMonth: 5,
        monthlyTokenBudget: 500_000,
        collaborationThreads: true,
        questionnaireTemplates: 0,
        brandedPortal: false,
        pipelineAnalytics: false,
        renewalAutomation: false,
        commissionTracking: false,
        bulkImportLimit: 10,
        apiAccess: false,
        teamMembers: 1,
        portfolioGapView: false,
        analysisComparison: false,
        savingsReportExport: false,
        brandedReport: false,
        priorityQueue: false,
        crossSellIntelligence: false,
        proposalFlow: false,
        documentRequestFlow: false,
        sharedPolicyRoom: false,
        asyncMessaging: true,
        privateNotes: false,
    },
    agent_starter: {
        maxCustomers: 100,
        maxPoliciesPerCustomer: 20,
        aiAnalysesPerMonth: 50,
        monthlyTokenBudget: 2_000_000,
        collaborationThreads: true,
        questionnaireTemplates: 5,
        brandedPortal: true,
        pipelineAnalytics: true,
        renewalAutomation: false,
        commissionTracking: false,
        bulkImportLimit: 100,
        apiAccess: false,
        teamMembers: 1,
        portfolioGapView: true,
        analysisComparison: true,
        savingsReportExport: false,
        brandedReport: false,
        priorityQueue: false,
        crossSellIntelligence: false,
        proposalFlow: true,
        documentRequestFlow: true,
        sharedPolicyRoom: true,
        asyncMessaging: true,
        privateNotes: false,
    },
    agent_pro: {
        maxCustomers: 500,
        maxPoliciesPerCustomer: null,
        aiAnalysesPerMonth: 200,
        monthlyTokenBudget: 10_000_000,
        collaborationThreads: true,
        questionnaireTemplates: null,
        brandedPortal: true,
        pipelineAnalytics: true,
        renewalAutomation: true,
        commissionTracking: true,
        bulkImportLimit: 500,
        apiAccess: false, // de-listed: sold with zero implementation. Re-enable when a real API + keys ship.
        teamMembers: 3,
        portfolioGapView: true,
        analysisComparison: true,
        savingsReportExport: true,
        brandedReport: true,
        priorityQueue: true,
        crossSellIntelligence: true,
        proposalFlow: true,
        documentRequestFlow: true,
        sharedPolicyRoom: true,
        asyncMessaging: true,
        privateNotes: true,
    },
    agency: {
        maxCustomers: null,
        maxPoliciesPerCustomer: null,
        aiAnalysesPerMonth: null,
        monthlyTokenBudget: 25_000_000,
        collaborationThreads: true,
        questionnaireTemplates: null,
        brandedPortal: true,
        pipelineAnalytics: true,
        renewalAutomation: true,
        commissionTracking: true,
        bulkImportLimit: null,
        apiAccess: false, // de-listed: sold with zero implementation. Re-enable when a real API + keys ship.
        teamMembers: null,
        portfolioGapView: true,
        analysisComparison: true,
        savingsReportExport: true,
        brandedReport: true,
        priorityQueue: true,
        crossSellIntelligence: true,
        proposalFlow: true,
        documentRequestFlow: true,
        sharedPolicyRoom: true,
        asyncMessaging: true,
        privateNotes: true,
    },
}

// ── Price / trial / token fallbacks ──────────────────────────────────

/**
 * Advertised VAT-inclusive annual prices (EUR) per canonical plan id.
 * Fallback for Plan.annualPrice; a plan absent here falls back to 12× monthly.
 */
export const DEFAULT_ANNUAL_PRICE_BY_PLAN: Record<string, number> = {
    "ph-plus": 29, // Starter — UI: €29/yr  (monthly €2.99 × 12 = €35.88)
    "ph-pro": 79, // Plus    — UI: €79/yr  (monthly €7.99 × 12 = €95.88)
    "agent-starter": 199, // UI: €199/yr (monthly €19.99 × 12 = €239.88)
    "agent-pro": 499, // UI: €499/yr (monthly €49.99 × 12 = €599.88)
    "agent-agency": 999, // UI: €999/yr (monthly €99.99 × 12 = €1199.88)
}

/** Fallback for Plan.trialDays. A plan absent here has NO trial. */
export const DEFAULT_TRIAL_DAYS_BY_PLAN: Record<string, number> = {
    "ph-pro": 14,
}

/** B2C monthly token budgets — kept in lockstep with
 *  DEFAULT_ENTITLEMENT_LIMITS[tier].monthlyTokenBudget (parity-tested). */
export const DEFAULT_TOKEN_LIMITS: Record<PlanTier, number | null> = {
    free: 0,
    plus: 0,
    pro: 3_000_000,
}

// ── Canonical plan rows (synthetic catalog + seed source) ────────────

export interface DefaultPlanFacts {
    id: string
    planType: "policyholder" | "agent"
    /** Machine tier name stored in Plan.name (normalizeTier input). */
    name: string
    displayName: string
    tierKey: TierKey
    monthlyEur: number
    annualEur: number | null
    trialDays: number
    sortOrder: number
}

/**
 * The seven canonical plans. Used to build the synthetic catalog when the DB
 * is unreachable and as the single source for prisma/plan-seed-data.ts.
 */
export const DEFAULT_PLAN_FACTS: readonly DefaultPlanFacts[] = [
    { id: "ph-free", planType: "policyholder", name: "Free", displayName: "Free", tierKey: "free", monthlyEur: 0, annualEur: null, trialDays: 0, sortOrder: 0 },
    { id: "ph-plus", planType: "policyholder", name: "Plus", displayName: "Starter", tierKey: "plus", monthlyEur: 2.99, annualEur: 29, trialDays: 0, sortOrder: 1 },
    { id: "ph-pro", planType: "policyholder", name: "Pro", displayName: "PolicyWallet Plus", tierKey: "pro", monthlyEur: 7.99, annualEur: 79, trialDays: 14, sortOrder: 2 },
    { id: "agent-free", planType: "agent", name: "agent_free", displayName: "Agent Free", tierKey: "agent_free", monthlyEur: 0, annualEur: null, trialDays: 0, sortOrder: 0 },
    { id: "agent-starter", planType: "agent", name: "agent_starter", displayName: "Agent Starter", tierKey: "agent_starter", monthlyEur: 19.99, annualEur: 199, trialDays: 0, sortOrder: 1 },
    { id: "agent-pro", planType: "agent", name: "agent_pro", displayName: "Agent Pro", tierKey: "agent_pro", monthlyEur: 49.99, annualEur: 499, trialDays: 0, sortOrder: 2 },
    { id: "agent-agency", planType: "agent", name: "agency", displayName: "Agency", tierKey: "agency", monthlyEur: 99.99, annualEur: 999, trialDays: 0, sortOrder: 3 },
]

/** Canonical entitlements for a tier key (either audience). */
export function defaultEntitlementsForTier(
    tierKey: TierKey
): EntitlementLimits | AgentEntitlementLimits {
    return isAgentTierKey(tierKey)
        ? DEFAULT_AGENT_ENTITLEMENT_LIMITS[tierKey]
        : DEFAULT_ENTITLEMENT_LIMITS[tierKey as PlanTier]
}
