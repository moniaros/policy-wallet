/**
 * Token Tracking Service
 * Tracks AI token usage, costs, and manages token balances
 */

import { randomUUID } from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import { db as prisma } from '@/lib/db'
import { getUserSubscription } from '@/lib/subscription-limits'
import { Decimal } from '@prisma/client/runtime/library'
import {
    TOKEN_COSTS,
    resolveTokenCosts,
    type AIModel,
    type OperationType,
    formatTokens,
    formatCost
} from '@/lib/token-utils'

// Re-export for backward compatibility if needed, but preferably use token-utils directly
export { formatTokens, formatCost, TOKEN_COSTS, type AIModel, type OperationType }

// Token budgets are the single AI meter (per-day feature counters are abuse
// guards only). Free AND Starter (code key `plus`) are 0 — the paid-aha-loop
// model puts ALL deep AI behind Plus (code key `pro`), so only `pro` gets a
// budget. Parse/extraction is the one AI op free/Starter may run and is
// exempt from this gate (policy-count-capped instead). Pro is capped at 3M so
// worst-case provider cost stays under the plan price
// (see docs/planning/TOKEN_ECONOMICS_2026-07.md).
//
// These are now the CODE FALLBACK of the admin-managed plan catalog: the live
// budget comes from the plan row's entitlements.monthlyTokenBudget (see
// resolveTokenBudget below); this table applies when the row has no canonical
// entitlements yet.
import { DEFAULT_TOKEN_LIMITS } from '@/lib/pricing/plan-defaults'
export const TOKEN_LIMITS: Record<'free' | 'plus' | 'pro', number | null> = DEFAULT_TOKEN_LIMITS

function normalizeTokenTier(rawTier: string): 'free' | 'plus' | 'pro' {
    const tier = (rawTier || 'free').toLowerCase()
    if (tier === 'essential') return 'plus'
    if (tier === 'professional') return 'pro'
    if (tier === 'plus' || tier === 'pro' || tier === 'free') return tier
    return 'free'
}

/**
 * Resolve the token budget for a user: agents draw on their AGENT-plan
 * monthlyTokenBudget (agent_free..agency); everyone else on the B2C tiers.
 * Agent-initiated analyses on customer policies are therefore metered against
 * the agent's own subscription, never the customer's.
 */
async function resolveTokenBudget(
    userId: string
): Promise<{ tier: string; limit: number | null }> {
    const [user, subscription] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { roles: true } }),
        prisma.subscription.findFirst({
            where: { userId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        }),
    ])

    const isAgentPlan = subscription?.plan?.planType === 'agent'
    const isAgentRole = (user?.roles || '')
        .split(',')
        .map((r) => r.trim())
        .includes('agent')

    if (isAgentPlan || isAgentRole) {
        const { resolveAgentEntitlements } = await import('@/lib/subscription-entitlements')
        const agent = await resolveAgentEntitlements(userId)
        return { tier: agent.tier, limit: agent.limits.monthlyTokenBudget ?? null }
    }

    // B2C mirrors the agent path: the resolved entitlements carry the live
    // (admin-editable) monthlyTokenBudget, falling back to TOKEN_LIMITS for
    // rows without canonical entitlements. `?? TOKEN_LIMITS[tier]` guards the
    // window where a legacy-shape row resolved through code defaults predating
    // the monthlyTokenBudget field (belt and braces — the defaults include it).
    const { resolveUserEntitlements } = await import('@/lib/subscription-entitlements')
    const entitlements = await resolveUserEntitlements(userId)
    const tier = normalizeTokenTier(entitlements.tier)
    return { tier, limit: entitlements.limits.monthlyTokenBudget ?? TOKEN_LIMITS[tier] }
}

/**
 * The subscription/purchased split, as a pure function.
 *
 * This is the REFERENCE DEFINITION. It is not called by `recordUsageAtomically`
 * — the split has to be computed inside the SQL statement or it races (see
 * below) — so this exists to make the rule executable and testable on its own,
 * and to give the SQL something precise to mirror.
 *
 * That mirroring is a convention, not a guarantee: nothing forces the two to
 * agree at runtime. The SQL is the code that actually runs.
 *
 *   null budget -> everything counts against the subscription (unlimited)
 *   otherwise   -> subscription takes what headroom is left, purchased the rest
 */
export function splitTokens(
    amount: number,
    budgetLimit: number | null,
    usedBefore: number
): { subscription: number; purchased: number } {
    if (budgetLimit === null) return { subscription: amount, purchased: 0 }
    const headroom = Math.max(budgetLimit - usedBefore, 0)
    const subscription = Math.min(amount, headroom)
    return { subscription, purchased: amount - subscription }
}

/**
 * Apply one usage record, its monthly rollup and any purchased-balance draw as
 * a SINGLE statement, so the subscription/purchased split cannot race.
 *
 * The subscription delta is the same expression in all four places it appears:
 *
 *   NULL budget            -> the whole amount is subscription (unlimited)
 *   otherwise              -> LEAST(amount, GREATEST(budget - used_before, 0))
 *
 * `used_before` is 0 on the insert path and `monthly_token_usage.total_tokens`
 * on the conflict path (pre-update, per Postgres ON CONFLICT semantics). In the
 * RETURNING clause the row is already updated, so `used_before` is recovered as
 * `total_tokens - amount`.
 *
 * Data-modifying CTEs are executed exactly once each regardless of whether the
 * outer query reads them, so the rollup still applies when the balance draw is
 * filtered out by `purchased_delta > 0`.
 *
 * The arithmetic below mirrors `splitTokens` above. Keep them in step: that
 * function is what the tests exercise, and this statement is what production
 * runs. Nothing enforces the correspondence at runtime.
 *
 * Exported for testing: the SQL is the whole point of this function, and a
 * silent revert to JS-side arithmetic would reintroduce the race invisibly.
 */
export async function recordUsageAtomically(input: {
    userId: string
    operationType: OperationType
    policyId: string | null
    inputTokens: number
    outputTokens: number
    totalTokens: number
    totalCost: number
    model: AIModel
    tier: string
    budgetLimit: number | null
    month: Date
}): Promise<void> {
    const amount = BigInt(input.totalTokens)
    const budget = input.budgetLimit === null ? null : BigInt(input.budgetLimit)
    // Prisma generates these with cuid(); raw inserts must supply their own.
    // Format is not constrained anywhere — only uniqueness matters.
    const usageId = randomUUID()
    const summaryId = randomUUID()
    const balanceId = randomUUID()
    // token_usage.cost_eur is Decimal(10,6) but monthly_token_usage.total_cost_eur
    // is Decimal(10,2). Send full precision to both and let each column round,
    // which is exactly what Prisma did before — rounding to 2 here first would
    // silently flatten every per-call cost to cents.
    const cost = new Decimal(input.totalCost).toFixed(6)
    // Sent as a plain YYYY-MM-DD string rather than a Date. `month` is built as
    // LOCAL midnight of the 1st; handing Postgres a timestamptz and casting to
    // ::date would resolve it in the server's timezone and could land on the
    // previous month for any zone ahead of UTC.
    const monthKey = `${input.month.getFullYear()}-${String(input.month.getMonth() + 1).padStart(2, '0')}-01`

    await prisma.$executeRaw`
        WITH usage AS (
            INSERT INTO "token_usage"
                ("usage_id", "user_id", "operation_type", "policy_id",
                 "input_tokens", "output_tokens", "total_tokens", "cost_eur",
                 "model", "created_at")
            VALUES
                (${usageId}, ${input.userId}, ${input.operationType}, ${input.policyId},
                 ${input.inputTokens}, ${input.outputTokens}, ${input.totalTokens}, ${cost}::numeric,
                 ${input.model}, now())
        ),
        rollup AS (
            INSERT INTO "monthly_token_usage"
                ("summary_id", "user_id", "month", "tier", "total_tokens",
                 "total_cost_eur", "subscription_tokens", "purchased_tokens_used", "created_at")
            VALUES (
                ${summaryId}, ${input.userId}, ${monthKey}::date, ${input.tier}, ${amount},
                ${cost}::numeric,
                CASE WHEN ${budget}::bigint IS NULL THEN ${amount}::bigint
                     ELSE LEAST(${amount}::bigint, GREATEST(${budget}::bigint, 0)) END,
                ${amount}::bigint - CASE WHEN ${budget}::bigint IS NULL THEN ${amount}::bigint
                     ELSE LEAST(${amount}::bigint, GREATEST(${budget}::bigint, 0)) END,
                now()
            )
            ON CONFLICT ("user_id", "month") DO UPDATE SET
                "total_tokens" = "monthly_token_usage"."total_tokens" + ${amount}::bigint,
                "total_cost_eur" = "monthly_token_usage"."total_cost_eur" + ${cost}::numeric,
                "subscription_tokens" = "monthly_token_usage"."subscription_tokens"
                    + CASE WHEN ${budget}::bigint IS NULL THEN ${amount}::bigint
                           ELSE LEAST(${amount}::bigint,
                                      GREATEST(${budget}::bigint - "monthly_token_usage"."total_tokens", 0)) END,
                "purchased_tokens_used" = "monthly_token_usage"."purchased_tokens_used"
                    + (${amount}::bigint
                       - CASE WHEN ${budget}::bigint IS NULL THEN ${amount}::bigint
                              ELSE LEAST(${amount}::bigint,
                                         GREATEST(${budget}::bigint - "monthly_token_usage"."total_tokens", 0)) END),
                "tier" = ${input.tier}
            RETURNING (
                ${amount}::bigint
                - CASE WHEN ${budget}::bigint IS NULL THEN ${amount}::bigint
                       ELSE LEAST(${amount}::bigint,
                                  GREATEST(${budget}::bigint
                                           - ("monthly_token_usage"."total_tokens" - ${amount}::bigint), 0)) END
            ) AS purchased_delta
        )
        INSERT INTO "token_balances"
            ("balance_id", "user_id", "purchased_tokens", "used_tokens", "created_at", "updated_at")
        SELECT ${balanceId}, ${input.userId}, 0, rollup.purchased_delta, now(), now()
        FROM rollup
        WHERE rollup.purchased_delta > 0
        ON CONFLICT ("user_id") DO UPDATE SET
            "used_tokens" = "token_balances"."used_tokens" + EXCLUDED."used_tokens",
            "updated_at" = now()
    `
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
    // Metering must never fail the analysis that produced the tokens:
    // resolveTokenCosts always returns a price (unknown models get a
    // conservative fallback), and any DB error is logged instead of thrown.
    try {
        const costs = resolveTokenCosts(params.model)
        const totalTokens = params.inputTokens + params.outputTokens

        // Calculate costs
        const inputCost = (params.inputTokens / 1_000_000) * costs.input
        const outputCost = (params.outputTokens / 1_000_000) * costs.output
        const totalCost = inputCost + outputCost

        const { tier, limit: budgetLimit } = await resolveTokenBudget(params.userId)
        const now = new Date()
        const month = new Date(now.getFullYear(), now.getMonth(), 1)

        // The subscription-vs-purchased split is computed IN THE DATABASE, in
        // the same statement that applies it (POLICYWALLET-W follow-up).
        //
        // It used to be computed in JS from a separate read. That read never
        // locked anything — Postgres runs at READ COMMITTED — so two concurrent
        // calls for the same user both saw the same "tokens used before" and
        // both awarded themselves the same remaining subscription headroom.
        // With a 1,000,000 budget at 999,500 used, two concurrent 1,500-token
        // calls each charged 500 to the subscription and 1,000 to purchased:
        // 1,000 subscription tokens granted beyond the budget, and 500
        // purchased tokens never billed. It skews toward UNDER-charging, and
        // every AI call is a concurrent write candidate.
        //
        // ON CONFLICT DO UPDATE takes a row lock, so folding the read into the
        // write serialises concurrent callers on (user_id, month). Inside
        // DO UPDATE, an unqualified `monthly_token_usage.x` is the PRE-update
        // value — that is what makes the split exact.
        //
        // Semantics are unchanged: still incremental (each call consumes what
        // headroom remains at the moment it lands), not recomputed from the
        // running total. Recomputing would be simpler but would retroactively
        // re-classify earlier usage when a plan changes mid-month, which would
        // have to un-bill purchased tokens already charged.
        await recordUsageAtomically({
            userId: params.userId,
            operationType: params.operationType,
            policyId: params.policyId ?? null,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
            totalTokens,
            totalCost,
            model: params.model,
            tier,
            budgetLimit,
            month,
        })
    } catch (error) {
        // Provider-billed spend that goes unrecorded must at least alert ops.
        console.error('[token-tracking] trackTokenUsage failed (usage not recorded)', {
            userId: params.userId,
            model: params.model,
            operationType: params.operationType,
            error: error instanceof Error ? error.message : String(error),
        })
        Sentry.captureException(error, {
            tags: { component: 'token-tracking' },
            extra: {
                userId: params.userId,
                model: params.model,
                operationType: params.operationType,
                inputTokens: params.inputTokens,
                outputTokens: params.outputTokens,
            },
        })
    }
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
    const { tier, limit } = await resolveTokenBudget(userId)
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)

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
    const { tier, limit } = await resolveTokenBudget(userId)
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
 * Zero out reserved_tokens for users with no running analysis — reservations
 * are only live while a run is running, so anything left over is a leak
 * (killed executor) silently shrinking the user's monthly budget. Called by
 * the stale-analysis reaper cron. Lives here so every raw-SQL touch of
 * monthly_token_usage stays in this module.
 */
export async function clearOrphanedReservations(): Promise<number> {
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)
    return prisma.$executeRaw`
        UPDATE monthly_token_usage m
        SET reserved_tokens = 0
        WHERE m.month = ${month}
          AND m.reserved_tokens > 0
          AND NOT EXISTS (
              SELECT 1 FROM policy_analysis_runs r
              WHERE r.user_id = m.user_id AND r.status = 'running'
          )`
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
