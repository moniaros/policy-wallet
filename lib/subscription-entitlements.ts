import { db as prisma } from "@/lib/db"
import type {
    AgentEntitlementLimits,
    AgentEntitlements,
    AgentTier,
    EntitlementLimits,
    PlanTier,
    UserEntitlements,
} from "@/types/subscription-entitlements"

// ── B2C Policyholder Limits ──────────────────────────────────────────

export const ENTITLEMENT_LIMITS: Record<PlanTier, EntitlementLimits> = {
    free: {
        policies: 3,
        aiAnalysisPerMonth: 10,
        questionsPerDay: 10,
        gapAnalysisPerDay: 2,
        notifications: false,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: true,
        analysisComparison: false,
        portfolioGapView: false,
        priorityQueue: false,
        savingsReportExport: false,
    },
    plus: {
        policies: 10,
        aiAnalysisPerMonth: 25,
        questionsPerDay: 25,
        gapAnalysisPerDay: 5,
        notifications: true,
        advancedAnalytics: false,
        agentCollaboration: true,
        interactiveQA: true,
        analysisComparison: true,
        portfolioGapView: true,
        priorityQueue: false,
        savingsReportExport: false,
    },
    pro: {
        policies: null,
        aiAnalysisPerMonth: null,
        questionsPerDay: null,
        gapAnalysisPerDay: null,
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

// ── B2B Agent Limits ─────────────────────────────────────────────────

export const AGENT_ENTITLEMENT_LIMITS: Record<AgentTier, AgentEntitlementLimits> = {
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
        priorityQueue: false,
        crossSellIntelligence: false,
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
        priorityQueue: false,
        crossSellIntelligence: false,
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
        apiAccess: true,
        teamMembers: 3,
        portfolioGapView: true,
        analysisComparison: true,
        savingsReportExport: true,
        priorityQueue: true,
        crossSellIntelligence: true,
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
        apiAccess: true,
        teamMembers: null,
        portfolioGapView: true,
        analysisComparison: true,
        savingsReportExport: true,
        priorityQueue: true,
        crossSellIntelligence: true,
    },
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

function normalizeTier(raw?: string | null): PlanTier {
    const tierRaw = (raw || "free").toLowerCase()
    if (tierRaw === "essential") return "plus"
    if (tierRaw === "professional") return "pro"
    if (tierRaw === "plus" || tierRaw === "pro" || tierRaw === "free") return tierRaw
    return "free"
}

function normalizeAgentTier(raw?: string | null): AgentTier {
    const tierRaw = (raw || "agent_free").toLowerCase()
    if (tierRaw === "agent_starter" || tierRaw === "starter") return "agent_starter"
    if (tierRaw === "agent_pro" || tierRaw === "professional") return "agent_pro"
    if (tierRaw === "agency") return "agency"
    return "agent_free"
}

export async function resolveUserEntitlements(userId: string): Promise<UserEntitlements> {
    const subscription = await prisma.subscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
    })

    const tier = normalizeTier(subscription?.plan?.name)
    return {
        tier,
        status: subscription?.status || "active",
        isPaid: tier !== "free",
        limits: ENTITLEMENT_LIMITS[tier],
    }
}

export async function resolveAgentEntitlements(userId: string): Promise<AgentEntitlements> {
    const subscription = await prisma.subscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
    })

    // Agent plans have planType = "agent"
    const isAgentPlan = subscription?.plan?.planType === "agent"
    const tier = isAgentPlan
        ? normalizeAgentTier(subscription?.plan?.name)
        : "agent_free"

    return {
        tier,
        status: subscription?.status || "active",
        isPaid: tier !== "agent_free",
        limits: AGENT_ENTITLEMENT_LIMITS[tier],
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

export async function canAgentRunAnalysis(userId: string): Promise<{
    allowed: boolean
    reason?: string
    used?: number
    limit?: number | null
}> {
    const entitlements = await resolveAgentEntitlements(userId)
    const limit = entitlements.limits.aiAnalysesPerMonth

    if (limit === null) return { allowed: true }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const analysisCount = await prisma.policyAnalysisRun.count({
        where: {
            policy: { createdByUserId: userId },
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
