/**
 * Subscription Limits & Feature Access Control
 * Backward-compatible wrappers over centralized entitlements.
 */

import { db as prisma } from "@/lib/db"
import {
    ENTITLEMENT_LIMITS,
    resolveUserEntitlements,
} from "@/lib/subscription-entitlements"
import type { PlanTier } from "@/types/subscription-entitlements"

export const SUBSCRIPTION_LIMITS = ENTITLEMENT_LIMITS

export type SubscriptionTier = PlanTier
export type FeatureKey = keyof typeof SUBSCRIPTION_LIMITS.free

export async function getUserSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
    })

    const entitlements = await resolveUserEntitlements(userId)
    return {
        tier: entitlements.tier,
        status: entitlements.status,
        subscription,
    }
}

export async function canUserAddPolicy(userId: string): Promise<{
    allowed: boolean
    reason?: string
    current?: number
    limit?: number
}> {
    const entitlements = await resolveUserEntitlements(userId)
    const limit = entitlements.limits.policies

    if (limit === null) {
        return { allowed: true }
    }

    const policyCount = await prisma.policy.count({
        where: { ownerUserId: userId },
    })

    if (policyCount >= limit) {
        return {
            allowed: false,
            reason: "policy_limit_reached",
            current: policyCount,
            limit,
        }
    }

    return {
        allowed: true,
        current: policyCount,
        limit,
    }
}

export async function canUserUseFeature(
    userId: string,
    feature: FeatureKey
): Promise<boolean> {
    const entitlements = await resolveUserEntitlements(userId)
    const value = entitlements.limits[feature]

    if (typeof value === "boolean") return value
    if (value === null) return true
    return true
}

export async function getUserUsageStats(userId: string) {
    const entitlements = await resolveUserEntitlements(userId)

    const policyCount = await prisma.policy.count({
        where: { ownerUserId: userId },
    })

    return {
        tier: entitlements.tier,
        policies: {
            used: policyCount,
            limit: entitlements.limits.policies,
            percentage: entitlements.limits.policies
                ? (policyCount / entitlements.limits.policies) * 100
                : 0,
        },
        features: {
            notifications: entitlements.limits.notifications,
            advancedAnalytics: entitlements.limits.advancedAnalytics,
            agentCollaboration: entitlements.limits.agentCollaboration,
            interactiveQA: entitlements.limits.interactiveQA,
        },
    }
}

export async function isSubscriptionActive(userId: string): Promise<boolean> {
    const entitlements = await resolveUserEntitlements(userId)
    return entitlements.status === "active"
}

export function getUpgradeMessage(reason: string, language: "el" | "en" = "el") {
    const messages = {
        policy_limit_reached: {
            el: "Έχετε φτάσει το όριο συμβολαίων του πλάνου σας. Αναβαθμίστε για περισσότερα.",
            en: "You reached your plan's policy limit. Upgrade for more capacity.",
        },
        feature_locked: {
            el: "Αυτό είναι χαρακτηριστικό επί πληρωμή πλάνου. Αναβαθμίστε για πρόσβαση.",
            en: "This feature is available on paid plans. Upgrade to unlock access.",
        },
        notifications_disabled: {
            el: "Οι ειδοποιήσεις email είναι διαθέσιμες σε επί πληρωμή πλάνα.",
            en: "Email notifications are available on paid plans.",
        },
    }

    return (
        messages[reason as keyof typeof messages]?.[language] ||
        messages.feature_locked[language]
    )
}
