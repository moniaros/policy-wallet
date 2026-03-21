import { db as prisma } from "@/lib/db"
import type {
    EntitlementLimits,
    PlanTier,
    UserEntitlements,
} from "@/types/subscription-entitlements"

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

function normalizeTier(raw?: string | null): PlanTier {
    const tierRaw = (raw || "free").toLowerCase()
    if (tierRaw === "essential") return "plus"
    if (tierRaw === "professional") return "pro"
    if (tierRaw === "plus" || tierRaw === "pro" || tierRaw === "free") return tierRaw
    return "free"
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
