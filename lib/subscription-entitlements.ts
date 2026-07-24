import { db as prisma } from "@/lib/db"

// Pure local copy of the agent-role check — this module is imported by
// client components, so it must not pull in lib/api-auth (whose import
// chain reaches next/headers via the Supabase server client).
function rolesIncludeAgent(rolesRaw: string | null | undefined): boolean {
    if (!rolesRaw) return false
    return rolesRaw.split(",").some((role) => role.trim() === "agent")
}
import type {
    AgentEntitlementLimits,
    AgentEntitlements,
    AgentTier,
    EntitlementLimits,
    PlanTier,
    UserEntitlements,
} from "@/types/subscription-entitlements"

// ── Tier limits ──────────────────────────────────────────────────────
// The tables moved to lib/pricing/plan-defaults.ts (client-safe) as the CODE
// FALLBACK of the admin-managed plan catalog. Live limits come from the DB
// plan row's entitlements JSON (validated below); these defaults apply when
// the row is missing or not in canonical shape. Re-exported under the old
// names so existing imports keep working.

import {
    DEFAULT_AGENT_ENTITLEMENT_LIMITS,
    DEFAULT_ENTITLEMENT_LIMITS,
    isAgentTierKey,
    isB2cTierKey,
} from "@/lib/pricing/plan-defaults"
import {
    AgentEntitlementLimitsSchema,
    EntitlementLimitsSchema,
} from "@/lib/pricing/entitlement-schema"
import { startOfAthensMonth } from "@/lib/policy-status"

export const ENTITLEMENT_LIMITS: Record<PlanTier, EntitlementLimits> =
    DEFAULT_ENTITLEMENT_LIMITS
export const AGENT_ENTITLEMENT_LIMITS: Record<AgentTier, AgentEntitlementLimits> =
    DEFAULT_AGENT_ENTITLEMENT_LIMITS

// ── Agent Tier Hierarchy (for plan gating) ─────────────────────────

export const AGENT_TIER_HIERARCHY: Record<AgentTier, number> = {
    agent_free: 0,
    agent_starter: 1,
    agent_pro: 2,
    agency: 3,
}

export function isAgentTierSufficient(
    currentTier: AgentTier,
    requiredTier: AgentTier
): boolean {
    return AGENT_TIER_HIERARCHY[currentTier] >= AGENT_TIER_HIERARCHY[requiredTier]
}

// ── B2B Agent Pricing ────────────────────────────────────────────────

export const AGENT_PRICING: Record<AgentTier, {
    monthlyEur: number
    label: { en: string; el: string }
    tokenTopUpEur: number | null
}> = {
    agent_free: {
        monthlyEur: 0,
        label: { en: "Agent Free", el: "Δωρεάν Πράκτορας" },
        tokenTopUpEur: null,
    },
    agent_starter: {
        monthlyEur: 19.99,
        label: { en: "Agent Starter", el: "Πράκτορας Starter" },
        tokenTopUpEur: 1.99, // per 100K tokens
    },
    agent_pro: {
        monthlyEur: 49.99,
        label: { en: "Agent Pro", el: "Πράκτορας Pro" },
        tokenTopUpEur: 0.99, // per 100K tokens
    },
    agency: {
        monthlyEur: 99.99,
        label: { en: "Agency", el: "Πρακτορείο" },
        tokenTopUpEur: 0.49, // per 100K tokens
    },
}

// ── Tier Resolution ──────────────────────────────────────────────────

export function normalizeTier(raw?: string | null): PlanTier {
    const tierRaw = (raw || "free").toLowerCase()
    if (tierRaw === "essential") return "plus"
    if (tierRaw === "professional") return "pro"
    // Legacy "Premium" plan rows (ph-premium, €24.99) predate the Plus/Pro
    // scheme; treating them as free would strip a paying subscriber's access.
    if (tierRaw.includes("premium")) return "pro"
    if (tierRaw === "plus" || tierRaw === "pro" || tierRaw === "free") return tierRaw
    return "free"
}

export function normalizeAgentTier(raw?: string | null): AgentTier {
    const tierRaw = (raw || "agent_free").toLowerCase()
    if (tierRaw === "agent_starter" || tierRaw === "starter") return "agent_starter"
    if (tierRaw === "agent_pro" || tierRaw === "professional") return "agent_pro"
    if (tierRaw === "agency") return "agency"
    return "agent_free"
}

/**
 * A paid subscription row counts only while it is genuinely live:
 * - Stripe-backed rows (stripeSubscriptionId set) follow their status —
 *   the webhook lifecycle owns them.
 * - Rows WITHOUT a Stripe id (legacy free-grant fallback, now removed)
 *   are grandfathered ONLY until their currentPeriodEnd, per the
 *   2026-07-11 decision. After that they resolve to free.
 */
export function isSubscriptionLive(subscription: {
    status: string
    stripeSubscriptionId?: string | null
    currentPeriodEnd?: Date | null
    provider?: string | null
} | null | undefined): boolean {
    if (!subscription) return false
    if (subscription.status !== "active") return false
    if (subscription.stripeSubscriptionId || subscription.provider === "revenue_cat") return true
    // Rows without an expiry date can't be aged out — treat as live
    // (the prod schema requires currentPeriodEnd; this guards mocks/legacy).
    if (!(subscription.currentPeriodEnd instanceof Date)) return true
    return subscription.currentPeriodEnd.getTime() > Date.now()
}

/**
 * Live limits for a B2C plan row: explicit tier_key wins over name routing
 * when it is a known B2C key; the row's entitlements JSON applies when it
 * parses as the canonical shape, else the code defaults for the tier. Rows
 * still carrying the legacy informational entitlements shape therefore
 * behave exactly as before the admin-managed catalog.
 */
function resolveB2cPlanLimits(
    plan: { tierKey?: string | null; name?: string | null; entitlements?: unknown } | null | undefined
): { tier: PlanTier; limits: EntitlementLimits } {
    const tier = isB2cTierKey(plan?.tierKey) ? plan!.tierKey as PlanTier : normalizeTier(plan?.name)
    const parsed = EntitlementLimitsSchema.safeParse(plan?.entitlements)
    return { tier, limits: parsed.success ? parsed.data : ENTITLEMENT_LIMITS[tier] }
}

function resolveAgentPlanLimits(
    plan: { tierKey?: string | null; name?: string | null; entitlements?: unknown } | null | undefined
): { tier: AgentTier; limits: AgentEntitlementLimits } {
    const tier = isAgentTierKey(plan?.tierKey) ? plan!.tierKey as AgentTier : normalizeAgentTier(plan?.name)
    const parsed = AgentEntitlementLimitsSchema.safeParse(plan?.entitlements)
    return { tier, limits: parsed.success ? parsed.data : AGENT_ENTITLEMENT_LIMITS[tier] }
}

export async function resolveUserEntitlements(userId: string): Promise<UserEntitlements> {
    // Scoped to non-agent plans + active rows: a user can hold BOTH a
    // policyholder and an agent subscription — the raw latest row let each
    // type clobber the other's tier (an agent-starter purchase read as
    // policyholder "free"; a ph-plus purchase downgraded the agent tier).
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: "active", plan: { planType: { not: "agent" } } },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
    })

    const live = isSubscriptionLive(subscription)
    if (!live) {
        return {
            tier: "free",
            status: "active",
            isPaid: false,
            limits: ENTITLEMENT_LIMITS.free,
        }
    }
    const { tier, limits } = resolveB2cPlanLimits(subscription?.plan)
    return {
        tier,
        status: subscription?.status || "active",
        isPaid: tier !== "free",
        limits,
    }
}

export async function resolveAgentEntitlements(userId: string): Promise<AgentEntitlements> {
    // Same plan-type scoping as resolveUserEntitlements, agent side.
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: "active", plan: { planType: "agent" } },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
    })

    // Agent plans have planType = "agent"; same liveness rules as B2C.
    const isAgentPlan = subscription?.plan?.planType === "agent" && isSubscriptionLive(subscription)
    if (!isAgentPlan) {
        return {
            tier: "agent_free",
            status: subscription?.status || "active",
            isPaid: false,
            limits: AGENT_ENTITLEMENT_LIMITS.agent_free,
        }
    }
    const { tier, limits } = resolveAgentPlanLimits(subscription?.plan)
    return {
        tier,
        status: subscription?.status || "active",
        isPaid: tier !== "agent_free",
        limits,
    }
}

// ── Feature Gates ────────────────────────────────────────────────────

export type AgentFeatureKey = keyof AgentEntitlementLimits

export async function canAgentUseFeature(
    userId: string,
    feature: AgentFeatureKey
): Promise<boolean> {
    const entitlements = await resolveAgentEntitlements(userId)
    const value = entitlements.limits[feature]

    if (typeof value === "boolean") return value
    if (value === null) return true // null = unlimited
    if (typeof value === "number") return value > 0
    return false
}

export async function canAgentAddCustomer(userId: string): Promise<{
    allowed: boolean
    reason?: string
    current?: number
    limit?: number | null
}> {
    const entitlements = await resolveAgentEntitlements(userId)
    const limit = entitlements.limits.maxCustomers

    if (limit === null) return { allowed: true }

    const customerCount = await prisma.customerRelationship.count({
        where: { agentUserId: userId },
    })

    if (customerCount >= limit) {
        return {
            allowed: false,
            reason: "customer_limit",
            current: customerCount,
            limit,
        }
    }

    return { allowed: true, current: customerCount, limit }
}

/**
 * Per-customer policy cap for agent-managed policies: counts policies this
 * agent created for this customer against the tier's maxPoliciesPerCustomer.
 */
export async function canAgentAddPolicyForCustomer(
    agentId: string,
    customerId: string
): Promise<{
    allowed: boolean
    reason?: string
    current?: number
    limit?: number | null
}> {
    const entitlements = await resolveAgentEntitlements(agentId)
    const limit = entitlements.limits.maxPoliciesPerCustomer

    if (limit === null || limit === undefined) return { allowed: true }

    const policyCount = await prisma.policy.count({
        where: {
            ownerUserId: customerId,
            createdByUserId: agentId,
            status: { not: "deleted" },
        },
    })

    if (policyCount >= limit) {
        return {
            allowed: false,
            reason: "policy_per_customer_limit",
            current: policyCount,
            limit,
        }
    }

    return { allowed: true, current: policyCount, limit }
}

export async function canAgentRunAnalysis(userId: string): Promise<{
    allowed: boolean
    reason?: string
    used?: number
    limit?: number | null
}> {
    const entitlements = await resolveAgentEntitlements(userId)
    const limit = entitlements.limits.aiAnalysesPerMonth

    if (limit === null) return { allowed: true }

    // The reader's month, not the server's — see startOfAthensMonth.
    const startOfMonth = startOfAthensMonth(new Date())

    // Count runs the agent actually INITIATED this month (run.userId), not
    // runs on policies they created — grants let agents analyze customer-
    // shared policies too, and those must count against the same cap.
    const analysisCount = await prisma.policyAnalysisRun.count({
        where: {
            userId,
            createdAt: { gte: startOfMonth },
        },
    })

    if (analysisCount >= limit) {
        return {
            allowed: false,
            reason: "ai_analysis_limit",
            used: analysisCount,
            limit,
        }
    }

    return { allowed: true, used: analysisCount, limit }
}

/**
 * Gate for MANUAL analysis triggers (the "Run analysis" / retry buttons and
 * their API routes) — the ONE place the paying-only re-analysis rule lives.
 * Upload-time auto-analysis is a different path and is not gated here.
 *
 * Non-agent users pass through (their gate is the orchestrator's b2c
 * pro-tier check). Deliberately keyed on the AGENT role only — a pure-admin
 * operator is not an agent and must not be blocked by an agent-plan paywall.
 * Agent-role users need a paid agent plan AND headroom in their monthly
 * analysis cap.
 */
export async function canAgentTriggerManualAnalysis(
    userId: string,
    roles: string | null | undefined
): Promise<
    | { allowed: true }
    | { allowed: false; code: "AGENT_UPGRADE_REQUIRED" }
    | { allowed: false; code: "AGENT_ANALYSIS_LIMIT"; used?: number; limit?: number | null }
> {
    if (!rolesIncludeAgent(roles)) return { allowed: true }

    // "Paying" is satisfied by EITHER a paid agent plan OR a b2c pro plan —
    // a dual-role user who pays for b2c Pro must not be paywalled on their
    // own wallet just because their agent plan is free.
    const [agentEntitlements, userEntitlements] = await Promise.all([
        resolveAgentEntitlements(userId),
        resolveUserEntitlements(userId),
    ])
    if (!agentEntitlements.isPaid && userEntitlements.tier !== "pro") {
        return { allowed: false, code: "AGENT_UPGRADE_REQUIRED" }
    }

    // The per-plan monthly cap always applies to agent-role users — their
    // runs draw the agent-plan analysis count and token budget.
    const cap = await canAgentRunAnalysis(userId)
    if (!cap.allowed) {
        return { allowed: false, code: "AGENT_ANALYSIS_LIMIT", used: cap.used, limit: cap.limit }
    }

    return { allowed: true }
}
