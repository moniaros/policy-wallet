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

/**
 * Agent tier ordering, for "is this plan at least X?" gating.
 *
 * Lives here rather than in lib/subscription-entitlements.ts because the
 * question is asked by CLIENT components (AgentPlanGate blurs a panel a lower
 * tier cannot see). That module opens with `import { db } from "@/lib/db"`, so
 * importing one number from it pulled the whole Prisma client into the browser
 * bundle for /dashboard/agent and /customers — visible only as a stray
 * `database: no connection string configured` warning in the user's console.
 * Re-exported from the entitlements module so server callers are unaffected.
 */
export const AGENT_TIER_HIERARCHY: Record<AgentTier, number> = {
    agent_free: 0,
    agent_starter: 1,
    agent_pro: 2,
    agency: 3,
}

export function isAgentTierSufficient(currentTier: AgentTier, requiredTier: AgentTier): boolean {
    return AGENT_TIER_HIERARCHY[currentTier] >= AGENT_TIER_HIERARCHY[requiredTier]
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
    // ── Pricing v2 (2026-08-21): B2C is CAPACITY-based, not usage-based. ──
    //
    // The enforced limit is the POLICY COUNT. `aiAnalysisPerMonth` is null on
    // every B2C tier — analyses are unlimited, because metering them was what
    // made the old model incomprehensible ("what is an analysis?" is not a
    // question a consumer should have to answer to buy).
    //
    // `monthlyTokenBudget` is an internal abuse guard, NOT a product limit. It
    // must never be shown, named, or implied in any UI: when it trips the user
    // sees the Greek keep-and-inform message, never a token number.
    //
    // Free now includes full analysis. That is the point — a wallet that will
    // not read your policy is a filing cabinet, and the old free tier
    // (1 policy, zero AI) demonstrated the product's weakest form to everyone
    // who tried it.
    free: {
        policies: 3,
        aiAnalysisPerMonth: null,
        questionsPerDay: 0,
        gapAnalysisPerDay: 0,
        monthlyTokenBudget: 150_000,
        notifications: false,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: false,
        analysisComparison: false,
        portfolioGapView: false,
        priorityQueue: false,
        savingsReportExport: false,
    },
    // "Plus" (displayed) = €39/yr (€4.99/mo). Ten policies, full analysis.
    // (Code key stays `plus`; the display name moved from "Starter" to "Plus".)
    plus: {
        policies: 10,
        aiAnalysisPerMonth: null,
        questionsPerDay: 0,
        gapAnalysisPerDay: 0,
        monthlyTokenBudget: 600_000,
        notifications: true,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: false,
        analysisComparison: false,
        portfolioGapView: false,
        priorityQueue: false,
        savingsReportExport: false,
    },
    // "Family" (displayed) = €79/yr (€8.99/mo). Twenty-five policies — a
    // household's worth, which is the whole reason the tier exists.
    // (Code key stays `pro`; the display name moved from "Plus" to "Family".)
    pro: {
        policies: 25,
        aiAnalysisPerMonth: null,
        questionsPerDay: null,
        gapAnalysisPerDay: null,
        monthlyTokenBudget: 1_500_000,
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
        monthlyTokenBudget: 1_600_000,
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
        aiAnalysesPerMonth: 150,
        monthlyTokenBudget: 4_500_000,
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
        aiAnalysesPerMonth: 400,
        monthlyTokenBudget: 12_000_000,
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
    "ph-plus": 39, // Plus   — UI: €39/yr (monthly €4.99 × 12 = €59.88)
    "ph-pro": 79, // Family  — UI: €79/yr (monthly €8.99 × 12 = €107.88)
    // B2B is sold monthly. Annual is 10× monthly (two months free) and is not
    // advertised on the pricing page; it exists so an annual checkout has a price.
    "agent-starter": 290,
    "agent-pro": 790,
    "agent-agency": 1990,
}

/** Fallback for Plan.trialDays. A plan absent here has NO trial. */
export const DEFAULT_TRIAL_DAYS_BY_PLAN: Record<string, number> = {
    "ph-pro": 14,
}

/** B2C monthly token budgets — kept in lockstep with
 *  DEFAULT_ENTITLEMENT_LIMITS[tier].monthlyTokenBudget (parity-tested). */
export const DEFAULT_TOKEN_LIMITS: Record<PlanTier, number | null> = {
    free: 150_000,
    plus: 600_000,
    pro: 1_500_000,
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
    { id: "ph-plus", planType: "policyholder", name: "Plus", displayName: "Plus", tierKey: "plus", monthlyEur: 4.99, annualEur: 39, trialDays: 0, sortOrder: 1 },
    { id: "ph-pro", planType: "policyholder", name: "Pro", displayName: "Family", tierKey: "pro", monthlyEur: 8.99, annualEur: 79, trialDays: 14, sortOrder: 2 },
    { id: "agent-free", planType: "agent", name: "agent_free", displayName: "Agent Free", tierKey: "agent_free", monthlyEur: 0, annualEur: null, trialDays: 0, sortOrder: 0 },
    { id: "agent-starter", planType: "agent", name: "agent_starter", displayName: "Agent Starter", tierKey: "agent_starter", monthlyEur: 29, annualEur: 290, trialDays: 0, sortOrder: 1 },
    { id: "agent-pro", planType: "agent", name: "agent_pro", displayName: "Agent Pro", tierKey: "agent_pro", monthlyEur: 79, annualEur: 790, trialDays: 0, sortOrder: 2 },
    { id: "agent-agency", planType: "agent", name: "agency", displayName: "Agency", tierKey: "agency", monthlyEur: 199, annualEur: 1990, trialDays: 0, sortOrder: 3 },
]

/** Canonical entitlements for a tier key (either audience). */
export function defaultEntitlementsForTier(
    tierKey: TierKey
): EntitlementLimits | AgentEntitlementLimits {
    return isAgentTierKey(tierKey)
        ? DEFAULT_AGENT_ENTITLEMENT_LIMITS[tierKey]
        : DEFAULT_ENTITLEMENT_LIMITS[tierKey as PlanTier]
}
