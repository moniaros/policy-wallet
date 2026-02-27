import { requireApiUser } from "@/lib/api-auth"
import { createApiResponse } from "@/lib/api-utils"
import { getMonthlyUsage, getTokenBalance } from "@/lib/token-tracking"
import { getUserSubscription } from "@/lib/subscription-limits"
import type { PlanTier } from "@/types/subscription-entitlements"

const TOKEN_LIMITS: Record<PlanTier, number> = {
    free: 250_000,
    plus: 1_000_000,
    pro: 5_000_000,
}

export async function GET() {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const userId = authResult.dbUser.id
    const [{ tier }, monthlyUsage, tokenBalance] = await Promise.all([
        getUserSubscription(userId),
        getMonthlyUsage(userId),
        getTokenBalance(userId),
    ])

    // tier is already normalized to free|plus|pro by resolveUserEntitlements
    const monthlyLimit = TOKEN_LIMITS[tier] ?? TOKEN_LIMITS.free
    const usagePercent = Math.round((monthlyUsage.total_tokens / monthlyLimit) * 100)

    return createApiResponse({
        tier,
        subscription: {
            monthly_limit: monthlyLimit,
            tokens_used: monthlyUsage.total_tokens,
            tokens_remaining: Math.max(monthlyLimit - monthlyUsage.total_tokens, 0),
            usage_percent: Math.min(usagePercent, 100),
            cost_eur: monthlyUsage.total_cost,
        },
        purchased: {
            total_purchased: tokenBalance.purchased_tokens,
            total_used: tokenBalance.used_tokens,
            remaining: tokenBalance.remaining_tokens,
        },
    })
}
