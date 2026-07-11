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

export const FEATURE_GATES: Record<FeatureKey, FeatureGate> = {
    policy_upload_limit: {
        featureKey: "policy_upload_limit",
        requiredPlan: "plus",
        upgradeReason: "policy_limit",
        lockedViewedEvent: "upload_limit_reached",
    },
    full_ai_policy_analysis: {
        featureKey: "full_ai_policy_analysis",
        requiredPlan: "plus",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    advanced_gap_detection: {
        featureKey: "advanced_gap_detection",
        requiredPlan: "plus",
        upgradeReason: "gap_limit",
        lockedViewedEvent: "feature_locked_viewed",
    },
    unlimited_ai_questions: {
        featureKey: "unlimited_ai_questions",
        requiredPlan: "plus",
        upgradeReason: "daily_limit",
        lockedViewedEvent: "ai_question_limit_reached",
    },
    multi_insurer_insights: {
        featureKey: "multi_insurer_insights",
        requiredPlan: "plus",
        upgradeReason: "feature_locked",
        lockedViewedEvent: "feature_locked_viewed",
    },
    agent_collaboration: {
        featureKey: "agent_collaboration",
        requiredPlan: "plus",
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
        requiredPlan: "plus",
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
}

// ── Client-safe plan facts (parity-tested against server tables) ────

export const FREE_POLICY_LIMIT = 3
export const PLUS_POLICY_LIMIT = 10

export interface PlanPricing {
    planId: string
    monthlyEur: number
    annualEur: number
    /** Months effectively free when paying annually. */
    annualSavingsMonths: number
    trialDays?: number
}

export const PLAN_PRICING: Record<Exclude<PlanTier, "free">, PlanPricing> = {
    plus: { planId: "ph-plus", monthlyEur: 2.99, annualEur: 29, annualSavingsMonths: 2 },
    pro: { planId: "ph-pro", monthlyEur: 9.99, annualEur: 99, annualSavingsMonths: 2, trialDays: 14 },
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
