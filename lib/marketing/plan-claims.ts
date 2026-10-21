/**
 * What each plan ENFORCES, stated as a claim a public page may make.
 *
 * `lib/pricing/public-pricing-content.ts` is hand-authored prose. Nothing tied
 * it to the entitlement source, and on 2026-10-21 twelve of its thirty-eight
 * capability statements were false against enforced code (Free and Plus marked
 * «Πλήρης ανάλυση AI», Agent Pro «200» analyses against an enforced 150, …).
 * Every capability the page states now carries a `ClaimKey`, and
 * `tests/unit/plan-gating-parity.test.ts` compares what it renders with what
 * this module derives — from `plan-defaults.ts` and `feature-gates.ts`, never
 * from a literal tier name.
 *
 * CLIENT-SAFE: imports plan-defaults and feature-gates only.
 */

import { FEATURE_GATES, canRunDeepAnalysis, tierUnlocks } from "@/lib/monetization/feature-gates"
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS, DEFAULT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"
import type { AgentTier, PlanTier } from "@/types/subscription-entitlements"

export type B2cClaimKey =
    | "policies"
    | "basicSummary"
    | "deepAnalysis"
    | "gapDetection"
    | "duplicateDetection"
    | "exclusions"
    | "renewalDate"
    | "renewalEmail30"
    | "renewalLadder"
    | "interactiveQA"
    | "reportExport"
    | "advisorCollaboration"
    | "multiInsurerInsights"

export type AgentClaimKey =
    | "agent.clients"
    | "agent.analysesPerMonth"
    | "agent.bulkImportRows"
    | "agent.teamMembers"
    | "agent.questionnaireTemplates"
    | "agent.renewalAutomation"
    | "agent.priorityQueue"
    | "agent.commissionTracking"
    | "agent.crossSellIntelligence"

export type ClaimKey = B2cClaimKey | AgentClaimKey

/**
 * `true` / `false` — a capability. `number` — a count the plan enforces.
 * `null` — unlimited. `UNSTATED` — enforced on paper but not guaranteed in
 * practice, so NO public page may state it for that plan (see agent_free
 * analyses below); a table cell renders «—», a card omits the line.
 */
export const UNSTATED = "unstated" as const
export type ClaimValue = boolean | number | null | typeof UNSTATED

export function isAgentClaim(key: ClaimKey): key is AgentClaimKey {
    return key.startsWith("agent.")
}

export function planClaim(key: ClaimKey, tier: PlanTier | AgentTier): ClaimValue {
    if (isAgentClaim(key)) {
        const l = DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier as AgentTier]
        switch (key) {
            case "agent.clients":
                return l.maxCustomers
            case "agent.analysesPerMonth":
                // Agent Free is configured for 5 analyses a month, but its
                // 150,000-token budget sits at the per-run estimate
                // (run-preflight.ts): a run can be refused at zero usage,
                // depending on the active rule count of the branch. The number
                // is therefore not a promise the plan can keep, and is not
                // stated for that plan.
                return tier === "agent_free" ? UNSTATED : l.aiAnalysesPerMonth
            case "agent.bulkImportRows":
                return l.bulkImportLimit
            case "agent.teamMembers":
                return l.teamMembers
            case "agent.questionnaireTemplates":
                return l.questionnaireTemplates
            case "agent.renewalAutomation":
                return l.renewalAutomation
            case "agent.priorityQueue":
                return l.priorityQueue
            case "agent.commissionTracking":
                return l.commissionTracking
            case "agent.crossSellIntelligence":
                return l.crossSellIntelligence
        }
    }
    const l = DEFAULT_ENTITLEMENT_LIMITS[tier as PlanTier]
    switch (key as B2cClaimKey) {
        case "policies":
            return l.policies
        // Upload-time extraction runs on every tier (extract/route.ts).
        case "basicSummary":
            return true
        // THE deep-analysis predicate. Never a literal tier.
        case "deepAnalysis":
            return canRunDeepAnalysis(tier as PlanTier)
        // The gap step runs INSIDE the deep pipeline (orchestrator gap_detection),
        // so it needs both the deep-analysis gate and the gap gate — reading
        // only `gapAnalysisPerDay` (which gates /api/v1/recommendations) would let
        // the two rows disagree the day full_ai_policy_analysis moves (PW-ENTITLE-01).
        case "gapDetection":
            return canRunDeepAnalysis(tier as PlanTier) && tierUnlocks(tier as PlanTier, FEATURE_GATES.advanced_gap_detection)
        // Portfolio rules, ungated (see plan-gating-parity.test.ts header).
        case "duplicateDetection":
            return true
        // The 30-day rung is sent on every tier (renewal.service.ts, milestones.ts).
        case "renewalEmail30":
            return true
        // Exclusions are stored at upload and rendered by ExclusionsCard with no gate.
        case "exclusions":
            return true
        // The end date is shown for every policy whose date was read.
        case "renewalDate":
            return true
        // The 90/60/30/15/7/3 ladder is the `notifications` entitlement.
        case "renewalLadder":
            return l.notifications
        case "interactiveQA":
            return l.interactiveQA
        case "reportExport":
            return Boolean(l.savingsReportExport)
        case "advisorCollaboration":
            return l.agentCollaboration
        case "multiInsurerInsights":
            return tierUnlocks(tier as PlanTier, FEATURE_GATES.multi_insurer_insights)
    }
}
