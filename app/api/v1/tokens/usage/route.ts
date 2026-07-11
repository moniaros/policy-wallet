import { requireApiUser } from "@/lib/api-auth"
import { createApiResponse } from "@/lib/api-utils"
import { getMonthlyUsage, getTokenBalance, TOKEN_LIMITS } from "@/lib/token-tracking"
import { getUserSubscription } from "@/lib/subscription-limits"

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

    // tier is already normalized to free|plus|pro by resolveUserEntitlements.
    // Same table as enforcement (lib/token-tracking) — the display and the
    // gate must never disagree. Free = 0 (AI is paid-only past the trial).
    const monthlyLimit = TOKEN_LIMITS[tier as 'free' | 'plus' | 'pro'] ?? 0
    const usagePercent = monthlyLimit > 0
        ? Math.round((monthlyUsage.total_tokens / monthlyLimit) * 100)
        : (monthlyUsage.total_tokens > 0 ? 100 : 0)

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
