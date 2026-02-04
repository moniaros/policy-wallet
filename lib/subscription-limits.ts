/**
 * Subscription Limits & Feature Access Control
 * Centralized logic for enforcing tier-based limits
 */

import { db as prisma } from '@/lib/db'

export const SUBSCRIPTION_LIMITS = {
    free: {
        policies: 3,
        aiAnalysisPerMonth: 10,
        questionsPerDay: 5,
        notifications: false,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: false,
    },
    essential: {
        policies: 10,
        aiAnalysisPerMonth: null, // unlimited
        questionsPerDay: null, // unlimited
        notifications: true,
        advancedAnalytics: false,
        agentCollaboration: false,
        interactiveQA: true,
    },
    professional: {
        policies: null, // unlimited
        aiAnalysisPerMonth: null, // unlimited
        questionsPerDay: null, // unlimited
        notifications: true,
        advancedAnalytics: true,
        agentCollaboration: true,
        interactiveQA: true,
    },
} as const

export type SubscriptionTier = 'free' | 'essential' | 'professional'
export type FeatureKey = keyof typeof SUBSCRIPTION_LIMITS.free

/**
 * Get user's subscription with tier information
 */
export async function getUserSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
    })

    const tier = (subscription?.plan?.name?.toLowerCase() || 'free') as SubscriptionTier

    return {
        tier: tier,
        status: subscription?.status || 'active',
        subscription,
    }
}

/**
 * Check if user can add a new policy
 */
export async function canUserAddPolicy(userId: string): Promise<{
    allowed: boolean
    reason?: string
    current?: number
    limit?: number
}> {
    const { tier } = await getUserSubscription(userId)

    // Get the limit for the user's tier
    const limit = SUBSCRIPTION_LIMITS[tier].policies

    // If unlimited (null), allow
    if (limit === null) {
        return { allowed: true }
    }

    const policyCount = await prisma.policy.count({
        where: { ownerUserId: userId },
    })

    if (policyCount >= limit) {
        return {
            allowed: false,
            reason: 'policy_limit_reached',
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

/**
 * Check if user can use a specific feature
 */
export async function canUserUseFeature(
    userId: string,
    feature: FeatureKey
): Promise<boolean> {
    const { tier } = await getUserSubscription(userId)
    const limits = SUBSCRIPTION_LIMITS[tier]

    // If the feature value is a boolean, return it directly
    if (typeof limits[feature] === 'boolean') {
        return limits[feature] as boolean
    }

    // If it's null (unlimited), return true
    if (limits[feature] === null) {
        return true
    }

    // For numeric limits, we'd need to check usage
    // This would require additional logic based on the feature
    return true
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: string) {
    const { tier } = await getUserSubscription(userId)
    const limits = SUBSCRIPTION_LIMITS[tier]

    const policyCount = await prisma.policy.count({
        where: { ownerUserId: userId },
    })

    return {
        tier,
        policies: {
            used: policyCount,
            limit: limits.policies,
            percentage: limits.policies ? (policyCount / limits.policies) * 100 : 0,
        },
        features: {
            notifications: limits.notifications,
            advancedAnalytics: limits.advancedAnalytics,
            agentCollaboration: limits.agentCollaboration,
            interactiveQA: limits.interactiveQA,
        },
    }
}

/**
 * Check if user's subscription is active and not past due
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
    const { status } = await getUserSubscription(userId)
    return status === 'active'
}

/**
 * Get upgrade prompt message based on context
 */
export function getUpgradeMessage(reason: string, language: 'el' | 'en' = 'el') {
    const messages = {
        policy_limit_reached: {
            el: 'Έχετε φτάσει το όριο των 3 συμβολαίων. Αναβαθμίστε σε Premium για απεριόριστα συμβόλαια.',
            en: 'You\'ve reached your limit of 3 policies. Upgrade to Premium for unlimited policies.',
        },
        feature_locked: {
            el: 'Αυτό είναι χαρακτηριστικό Premium. Αναβαθμίστε για να το ξεκλειδώσετε.',
            en: 'This is a Premium feature. Upgrade to unlock it.',
        },
        notifications_disabled: {
            el: 'Οι ειδοποιήσεις email είναι διαθέσιμες μόνο στο Premium πλάνο.',
            en: 'Email notifications are only available on the Premium plan.',
        },
    }

    return messages[reason as keyof typeof messages]?.[language] || messages.feature_locked[language]
}
