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

// Token budgets are the single AI meter (per-day feature counters are abuse
// guards only). Free is 0 — AI is paid-only apart from the one-time trial
// analysis, which bypasses this gate at the orchestrator. Pro is capped at 3M
// so worst-case provider cost stays under the plan price (see
// docs/planning/TOKEN_ECONOMICS_2026-07.md).
const TOKEN_LIMITS: Record<'free' | 'plus' | 'pro', number | null> = {
    free: 0,
    plus: 1_000_000,
    pro: 3_000_000,
}

function normalizeTokenTier(rawTier: string): 'free' | 'plus' | 'pro' {
    const tier = (rawTier || 'free').toLowerCase()
    if (tier === 'essential') return 'plus'
    if (tier === 'professional') return 'pro'
    if (tier === 'plus' || tier === 'pro' || tier === 'free') return tier
    return 'free'
}

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
    const totalTokens = params.inputTokens + params.outputTokens

    // Calculate costs
    const inputCost = (params.inputTokens / 1_000_000) * costs.input
    const outputCost = (params.outputTokens / 1_000_000) * costs.output
    const totalCost = inputCost + outputCost

    const { tier: rawTier } = await getUserSubscription(params.userId)
    const tier = normalizeTokenTier(rawTier)
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)

    await prisma.$transaction(async (tx) => {
        const existingMonthly = await tx.monthlyTokenUsage.findUnique({
            where: {
                userId_month: {
                    userId: params.userId,
                    month,
                },
            },
        })

        const monthlyUsedBefore = existingMonthly ? Number(existingMonthly.totalTokens) : 0
        const subscriptionLimit = TOKEN_LIMITS[tier]
        const subscriptionRemaining = subscriptionLimit === null
            ? totalTokens
            : Math.max(subscriptionLimit - monthlyUsedBefore, 0)
        const subscriptionConsumed = subscriptionLimit === null
            ? totalTokens
            : Math.min(subscriptionRemaining, totalTokens)
        const purchasedConsumed = Math.max(totalTokens - subscriptionConsumed, 0)

        await tx.tokenUsage.create({
            data: {
                userId: params.userId,
                operationType: params.operationType,
                policyId: params.policyId,
                inputTokens: params.inputTokens,
                outputTokens: params.outputTokens,
                totalTokens,
                costEur: new Decimal(totalCost),
                model: params.model,
            },
        })

        await tx.monthlyTokenUsage.upsert({
            where: {
                userId_month: {
                    userId: params.userId,
                    month,
                },
            },
            create: {
                userId: params.userId,
                month,
                tier,
                totalTokens: BigInt(totalTokens),
                totalCostEur: new Decimal(totalCost),
                subscriptionTokens: BigInt(subscriptionConsumed),
                purchasedTokensUsed: BigInt(purchasedConsumed),
            },
            update: {
                totalTokens: {
                    increment: BigInt(totalTokens),
                },
                totalCostEur: {
                    increment: new Decimal(totalCost),
                },
                subscriptionTokens: {
                    increment: BigInt(subscriptionConsumed),
                },
                purchasedTokensUsed: {
                    increment: BigInt(purchasedConsumed),
                },
                tier,
            },
        })

        if (purchasedConsumed > 0) {
            await tx.tokenBalance.upsert({
                where: { userId: params.userId },
                create: {
                    userId: params.userId,
                    purchasedTokens: BigInt(0),
                    usedTokens: BigInt(purchasedConsumed),
                },
                update: {
                    usedTokens: {
                        increment: BigInt(purchasedConsumed),
                    },
                },
            })
        }
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
 * Check if user can use tokens for an operation.
 * Accounts for both recorded usage and in-flight reservations.
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
    const { tier: rawTier } = await getUserSubscription(userId)
    const tier = normalizeTokenTier(rawTier)
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)
    const limit = TOKEN_LIMITS[tier]

    const usage = await prisma.monthlyTokenUsage.findUnique({
        where: { userId_month: { userId, month } },
    })

    const used = usage ? Number(usage.totalTokens) + Number((usage as any).reservedTokens ?? 0) : 0

    if (limit === null || used + estimatedTokens <= limit) {
        return {
            allowed: true,
            remainingTokens: limit === null ? Number.MAX_SAFE_INTEGER : limit - used,
            source: 'subscription',
        }
    }

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
 * Atomically reserve tokens before an AI step begins.
 *
 * Returns `{ allowed, source }` where `source` indicates whether the reservation
 * was made against the subscription pool ('subscription') or purchased tokens ('purchased').
 * The caller MUST only call `releaseTokenReservation` when `source === 'subscription'`.
 * Purchased-token paths do not increment `reserved_tokens` and must not release.
 */
export async function reserveTokens(
    userId: string,
    estimatedTokens: number
): Promise<{ allowed: boolean; reason?: string; source?: 'subscription' | 'purchased' }> {
    const { tier: rawTier } = await getUserSubscription(userId)
    const tier = normalizeTokenTier(rawTier)
    const limit = TOKEN_LIMITS[tier]
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)

    if (limit === null) {
        // Unlimited tier — ensure row exists, no check needed
        await prisma.monthlyTokenUsage.upsert({
            where: { userId_month: { userId, month } },
            create: {
                userId, month, tier,
                totalTokens: BigInt(0),
                totalCostEur: 0,
                subscriptionTokens: BigInt(0),
                purchasedTokensUsed: BigInt(0),
            },
            update: {},
        })
        return { allowed: true, source: 'subscription' }
    }

    // Atomic check-and-reserve: increment reservedTokens only if budget allows.
    // $executeRaw returns affected row count: 1 = success, 0 = WHERE failed (budget full or no row).
    const result = await prisma.$executeRaw`
        UPDATE monthly_token_usage
        SET reserved_tokens = reserved_tokens + ${BigInt(estimatedTokens)}
        WHERE user_id = ${userId}
          AND month = ${month}
          AND (total_tokens + reserved_tokens + ${BigInt(estimatedTokens)}) <= ${BigInt(limit)}`

    if (result === 1) {
        return { allowed: true, source: 'subscription' }
    }

    // Row may not exist yet (first use this month) — INSERT a blank row, then retry the atomic UPDATE.
    // We insert with reserved_tokens=0 so the retry UPDATE applies the same budget check cleanly.
    try {
        await prisma.$executeRaw`
            INSERT INTO monthly_token_usage
              (summary_id, user_id, month, tier, total_tokens, reserved_tokens,
               total_cost_eur, subscription_tokens, purchased_tokens_used)
            VALUES
              (gen_random_uuid()::text, ${userId}, ${month}, ${tier}, 0, 0, 0, 0, 0)
            ON CONFLICT (user_id, month) DO NOTHING`
    } catch {
        // Ignore — the row may have been created concurrently; proceed to retry UPDATE
    }

    // Retry the same atomic reserve now that the row is guaranteed to exist.
    // Bug fix: do NOT check the row after INSERT — the INSERT result is unreliable
    // (ON CONFLICT DO NOTHING hides whether we actually created it). Always re-run
    // the budget-guarded UPDATE so the check is consistent with the first attempt.
    const retryResult = await prisma.$executeRaw`
        UPDATE monthly_token_usage
        SET reserved_tokens = reserved_tokens + ${BigInt(estimatedTokens)}
        WHERE user_id = ${userId}
          AND month = ${month}
          AND (total_tokens + reserved_tokens + ${BigInt(estimatedTokens)}) <= ${BigInt(limit)}`

    if (retryResult === 1) {
        return { allowed: true, source: 'subscription' }
    }

    // Subscription exhausted — check purchased tokens for non-free tiers.
    // IMPORTANT: do NOT increment reserved_tokens here; purchased usage is tracked separately.
    if (tier !== 'free') {
        const balance = await getTokenBalance(userId)
        if (balance.remaining_tokens >= estimatedTokens) {
            return { allowed: true, source: 'purchased' }
        }
        return { allowed: false, reason: 'insufficient_tokens' }
    }

    return { allowed: false, reason: 'monthly_limit_reached' }
}

/**
 * Release a token reservation after a step completes or fails.
 * Decrements reservedTokens by the originally estimated amount.
 */
export async function releaseTokenReservation(
    userId: string,
    estimatedTokens: number
): Promise<void> {
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)
    await prisma.$executeRaw`
        UPDATE monthly_token_usage
        SET reserved_tokens = GREATEST(0, reserved_tokens - ${BigInt(estimatedTokens)})
        WHERE user_id = ${userId} AND month = ${month}`
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
