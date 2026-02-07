/**
 * Token Tracking Service
 * Tracks AI token usage, costs, and manages token balances
 */

import { db as prisma } from '@/lib/db'
import { getUserSubscription } from '@/lib/subscription-limits'
import { Decimal } from '@prisma/client/runtime/library'
import {
    TOKEN_COSTS,
    type AIModel,
    type OperationType,
    formatTokens,
    formatCost
} from '@/lib/token-utils'

// Re-export for backward compatibility if needed, but preferably use token-utils directly
export { formatTokens, formatCost, TOKEN_COSTS, type AIModel, type OperationType }

/**
 * Track token usage for an AI operation
 */
export async function trackTokenUsage(params: {
    userId: string
    operationType: OperationType
    policyId?: string
    inputTokens: number
    outputTokens: number
    model: AIModel
}): Promise<void> {
    const costs = TOKEN_COSTS[params.model]

    // Calculate costs
    const inputCost = (params.inputTokens / 1_000_000) * costs.input
    const outputCost = (params.outputTokens / 1_000_000) * costs.output
    const totalCost = inputCost + outputCost

    // Record usage
    await prisma.tokenUsage.create({
        data: {
            userId: params.userId,
            operationType: params.operationType,
            policyId: params.policyId,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
            totalTokens: params.inputTokens + params.outputTokens,
            costEur: new Decimal(totalCost),
            model: params.model,
        },
    })

    // Update monthly usage
    await updateMonthlyUsage(
        params.userId,
        params.inputTokens + params.outputTokens,
        totalCost
    )
}

/**
 * Update monthly token usage summary
 */
async function updateMonthlyUsage(
    userId: string,
    tokens: number,
    cost: number
): Promise<void> {
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)

    const { tier } = await getUserSubscription(userId)

    await prisma.monthlyTokenUsage.upsert({
        where: {
            userId_month: {
                userId,
                month,
            },
        },
        create: {
            userId,
            month,
            tier,
            totalTokens: BigInt(tokens),
            totalCostEur: new Decimal(cost),
            subscriptionTokens: BigInt(tokens),
            purchasedTokensUsed: BigInt(0),
        },
        update: {
            totalTokens: {
                increment: BigInt(tokens),
            },
            totalCostEur: {
                increment: new Decimal(cost),
            },
            tier, // Update tier in case it changed
        },
    })
}

/**
 * Get monthly usage for a user
 */
export async function getMonthlyUsage(userId: string) {
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)

    const usage = await prisma.monthlyTokenUsage.findUnique({
        where: {
            userId_month: {
                userId,
                month,
            },
        },
    })

    return {
        total_tokens: usage ? Number(usage.totalTokens) : 0,
        total_cost: usage ? Number(usage.totalCostEur) : 0,
        subscription_tokens: usage ? Number(usage.subscriptionTokens) : 0,
        purchased_tokens_used: usage ? Number(usage.purchasedTokensUsed) : 0,
    }
}

/**
 * Get token balance for a user
 */
export async function getTokenBalance(userId: string) {
    const balance = await prisma.tokenBalance.findUnique({
        where: { userId },
    })

    return {
        purchased_tokens: balance ? Number(balance.purchasedTokens) : 0,
        used_tokens: balance ? Number(balance.usedTokens) : 0,
        remaining_tokens: balance
            ? Number(balance.purchasedTokens) - Number(balance.usedTokens)
            : 0,
    }
}

/**
 * Check if user can use tokens for an operation
 */
export async function canUserUseTokens(
    userId: string,
    estimatedTokens: number
): Promise<{
    allowed: boolean
    reason?: string
    remainingTokens?: number
    source?: 'subscription' | 'purchased'
}> {
    const { tier } = await getUserSubscription(userId)
    const monthlyUsage = await getMonthlyUsage(userId)

    // Monthly limits by tier
    const limits = {
        free: 250_000, // 250K tokens/month
        plus: 1_000_000, // 1M tokens/month
        pro: 5_000_000, // 5M tokens/month
    }

    const limit = limits[tier]
    const used = monthlyUsage.total_tokens

    // Check subscription allowance
    if (used + estimatedTokens <= limit) {
        return {
            allowed: true,
            remainingTokens: limit - used,
            source: 'subscription',
        }
    }

    // For paid users, check purchased token balance
    if (tier !== 'free') {
        const balance = await getTokenBalance(userId)
        if (balance.remaining_tokens >= estimatedTokens) {
            return {
                allowed: true,
                remainingTokens: balance.remaining_tokens,
                source: 'purchased',
            }
        }

        return {
            allowed: false,
            reason: 'insufficient_tokens',
            remainingTokens: balance.remaining_tokens,
        }
    }

    return {
        allowed: false,
        reason: 'monthly_limit_reached',
        remainingTokens: 0,
    }
}

/**
 * Get usage statistics for admin dashboard
 */
export async function getAdminTokenStats(params?: {
    startDate?: Date
    endDate?: Date
    userId?: string
}) {
    const where: any = {}

    if (params?.startDate || params?.endDate) {
        where.createdAt = {}
        if (params.startDate) where.createdAt.gte = params.startDate
        if (params.endDate) where.createdAt.lte = params.endDate
    }

    if (params?.userId) {
        where.userId = params.userId
    }

    // Get total usage
    const totalUsage = await prisma.tokenUsage.aggregate({
        where,
        _sum: {
            totalTokens: true,
            costEur: true,
        },
        _count: true,
    })

    // Get usage by operation type
    const usageByOperation = await prisma.tokenUsage.groupBy({
        by: ['operationType'],
        where,
        _sum: {
            totalTokens: true,
            costEur: true,
        },
        _count: true,
    })

    // Get top users
    const topUsers = await prisma.tokenUsage.groupBy({
        by: ['userId'],
        where,
        _sum: {
            totalTokens: true,
            costEur: true,
        },
        _count: true,
        orderBy: {
            _sum: {
                totalTokens: 'desc',
            },
        },
        take: 10,
    })

    // Get usage by tier (from monthly summaries)
    const usageByTier = await prisma.monthlyTokenUsage.groupBy({
        by: ['tier'],
        _sum: {
            totalTokens: true,
            totalCostEur: true,
        },
        _count: true,
    })

    return {
        total: {
            tokens: Number(totalUsage._sum.totalTokens) || 0,
            cost: Number(totalUsage._sum.costEur) || 0,
            operations: totalUsage._count,
        },
        byOperation: usageByOperation.map((op) => ({
            type: op.operationType,
            tokens: Number(op._sum.totalTokens) || 0,
            cost: Number(op._sum.costEur) || 0,
            count: op._count,
        })),
        topUsers: topUsers.map((user) => ({
            userId: user.userId,
            tokens: Number(user._sum.totalTokens) || 0,
            cost: Number(user._sum.costEur) || 0,
            operations: user._count,
        })),
        byTier: usageByTier.map((tier) => ({
            tier: tier.tier,
            tokens: Number(tier._sum.totalTokens) || 0,
            cost: Number(tier._sum.totalCostEur) || 0,
            users: tier._count,
        })),
    }
}

/**
 * Get daily usage trends for charts
 */
export async function getDailyUsageTrends(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const usage = await prisma.$queryRaw<
        Array<{
            date: Date
            total_tokens: bigint
            total_cost: any
            operation_count: bigint
        }>
    >`
    SELECT 
      DATE(created_at) as date,
      SUM(total_tokens)::bigint as total_tokens,
      SUM(cost_eur) as total_cost,
      COUNT(*)::bigint as operation_count
    FROM token_usage
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

    return usage.map((day) => ({
        date: day.date,
        tokens: Number(day.total_tokens),
        cost: Number(day.total_cost),
        operations: Number(day.operation_count),
    }))
}
