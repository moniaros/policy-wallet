/**
 * Central feature-gate registry for the free→paid conversion system.
 *
 * CLIENT-SAFE: no server imports. The numeric facts below are snapshots of
 * the server sources of truth (lib/subscription-entitlements ENTITLEMENT_LIMITS,
 * lib/token-tracking TOKEN_LIMITS, DB plans / lib/billing ANNUAL_PRICE_BY_PLAN);
 * tests/unit/monetization-config.test.ts asserts parity so they can never
 * silently drift. Server enforcement stays in the API layer — these gates
 * drive UI, copy and analytics only.
 */

import type { PlanTier } from "@/types/subscription-entitlements"
import type { JourneyEventName } from "@/types/journey-events"

export type FeatureKey =
    | "policy_upload_limit"
    | "full_ai_policy_analysis"
    | "advanced_gap_detection"
    | "unlimited_ai_questions"
    | "multi_insurer_insights"
    | "agent_collaboration"
    | "export_report"
    | "advanced_renewal_reminders"
    | "pdf_preview"
    | "token_topup"
    | "duplicate_coverage_detection"
    | "claims_preparation_assistant"
    | "partner_offers"
    | "protection_monitoring"

/** Reasons understood by UpgradePrompt/LimitReachedModal (superset). */
export type UpgradeTriggerReason =
    | "policy_limit"
    | "feature_locked"
    | "notifications_disabled"
    | "daily_limit"
    | "gap_limit"
    | "token_limit"

export interface FeatureGate {
    featureKey: FeatureKey
    /** Lowest plan that unlocks the feature. */
    requiredPlan: Exclude<PlanTier, "free">
    /** Reason key for the existing prompt components. */
    upgradeReason: UpgradeTriggerReason
    /** Funnel event fired when the locked state is SHOWN. */
    lockedViewedEvent: JourneyEventName
}

// Paid-aha-loop model: every DEEP-AI feature unlocks at "pro" (displayed
// "Plus", €7.99). Only the organizer-level gates (more policies, in-app PDF
// preview, token top-ups) unlock at "plus" (displayed "Starter", €2.99).
/**
 * `family_portfolio` used to be defined here, with full upgrade copy — "See and
 * organize your whole family's policies together", four benefits and a primary
 * CTA reading "Enable family portfolio", gated at Pro.
 *
 * Nothing implemented it. No page gated on it, no component offered it, and no
 * plan granted it; the key appeared only in this registry and in the sales copy.
 * The copy was unreachable, so it was never shown — but a single
 * `<UpgradePrompt featureKey="family_portfolio">` would have rendered a paid
 * promise for a feature that does not exist. Removed rather than left loaded.
 *
 * `duplicate_coverage_detection` is a different case and stays: the capability
 * is real (see gap-engine portfolio-rules), it currently runs for every user,
 * and the gate is simply not applied anywhere. Whether that finding should sit
 * behind a plan is a pricing decision, not a cleanup.
 */
export const FEATURE_GATES: Record<FeatureKey, FeatureGate> = {
    policy_upload_limit: {
        featureKey: "policy_upload_limit",
        requiredPlan: "plus",
        upgradeReason: "policy_limit",
        lockedViewedEvent: "upload_limit_reached",
    },
    full_ai_policy_analysis: {
        featureKey: "full_ai_policy_analysis",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    advanced_gap_detection: {
        featureKey: "advanced_gap_detection",
        requiredPlan: "pro",
        upgradeReason: "gap_limit",
        lockedViewedEvent: "feature_locked_viewed",
    },
    unlimited_ai_questions: {
        featureKey: "unlimited_ai_questions",
        requiredPlan: "pro",
        upgradeReason: "daily_limit",
        lockedViewedEvent: "ai_question_limit_reached",
    },
    multi_insurer_insights: {
        featureKey: "multi_insurer_insights",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    agent_collaboration: {
        featureKey: "agent_collaboration",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    export_report: {
        featureKey: "export_report",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    advanced_renewal_reminders: {
        featureKey: "advanced_renewal_reminders",
        requiredPlan: "pro",
        upgradeReason: "notifications_disabled",
        lockedViewedEvent: "feature_locked_viewed",
    },
    pdf_preview: {
        featureKey: "pdf_preview",
        requiredPlan: "plus",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    token_topup: {
        featureKey: "token_topup",
        requiredPlan: "plus",
        upgradeReason: "token_limit",
        lockedViewedEvent: "feature_locked_viewed",
    },
    duplicate_coverage_detection: {
        featureKey: "duplicate_coverage_detection",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    claims_preparation_assistant: {
        featureKey: "claims_preparation_assistant",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    // Partner-benefits program: the full active catalog unlocks at Plus (code
    // `pro`); Starter may carry admin-assigned entries via each offer's
    // includedInTiers — this gate drives only the locked-teaser upsell.
    partner_offers: {
        featureKey: "partner_offers",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    // The dashboard's standing watch (lapsing cover, movement, open serious
    // exposures, freshness). Server truth: entitlements.limits.advancedAnalytics,
    // pro-only — consistent with every other continuous/deep-AI gate.
    protection_monitoring: {
        featureKey: "protection_monitoring",
        requiredPlan: "pro",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
}

// ── Client-safe plan facts (parity-tested against server tables) ────

export const FREE_POLICY_LIMIT = 3
/** "Plus" (code key `plus`) policy cap. */
export const PLUS_POLICY_LIMIT = 10
/** "Family" (code key `pro`) policy cap. Finite in pricing v2 — the tier
 *  ladder is capacity, so no B2C tier is unlimited. */
export const PRO_POLICY_LIMIT = 25
/**
 * Complimentary lifetime AI questions for free-tier users.
 * Zero under the paid-aha-loop tier restructure — deep-AI Q&A is a paid
 * feature with no free allowance. Kept as a named constant so the account /
 * wallet meters that reference it still compile; they render a 0 allowance.
 */
export const FREE_LIFETIME_QUESTIONS = 0

export interface PlanPricing {
    planId: string
    monthlyEur: number
    annualEur: number
    /** Months effectively free when paying annually. */
    annualSavingsMonths: number
    trialDays?: number
}

// Code key `plus` = displayed "Starter" (€2.99); code key `pro` = displayed
// "Plus" (€7.99, the recommended AI tier). See PlanBadge / public pricing for
// the display labels.
export const PLAN_PRICING: Record<Exclude<PlanTier, "free">, PlanPricing> = {
    // Pricing v2: annual-first. €39/yr vs €4.99/mo is ~4 months free, and
    // €79/yr vs €8.99/mo is ~3 — so annualSavingsMonths is computed, not
    // asserted, by round(12 - annual / monthly).
    plus: { planId: "ph-plus", monthlyEur: 4.99, annualEur: 39, annualSavingsMonths: 4 },
    pro: { planId: "ph-pro", monthlyEur: 8.99, annualEur: 79, annualSavingsMonths: 3, trialDays: 14 },
}

const TIER_RANK: Record<PlanTier, number> = { free: 0, plus: 1, pro: 2 }

export function tierUnlocks(tier: PlanTier, gate: FeatureGate): boolean {
    return TIER_RANK[tier] >= TIER_RANK[gate.requiredPlan]
}

/** The plan the modal should recommend for a given gate + current tier. */
export function recommendedPlan(tier: PlanTier, gate: FeatureGate): Exclude<PlanTier, "free"> {
    if (gate.requiredPlan === "pro") return "pro"
    return tier === "plus" ? "pro" : gate.requiredPlan
}
