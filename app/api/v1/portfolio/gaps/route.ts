import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { getPortfolioGapSummary } from "@/lib/services/analysis/portfolio-gap-view"
import { canUserUseFeature } from "@/lib/subscription-limits"

/**
 * GET /api/v1/portfolio/gaps
 *
 * Returns a cross-policy portfolio gap summary for the authenticated user.
 * Includes gaps grouped by severity, cross-policy overlap detection,
 * total estimated savings, and a portfolio risk score.
 *
 * Requires Plus+ tier (portfolioGapView entitlement).
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth }) => `portfolio:gaps:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth }) => {
        const authResult = auth!

        const allowed = await canUserUseFeature(authResult.dbUser.id, "portfolioGapView")
        if (!allowed && !authResult.dbUser.roles?.includes("admin")) {
            return createApiError(
                "FORBIDDEN",
                "Portfolio gap view is available on Plus and Pro plans.",
                403
            )
        }

        const summary = await getPortfolioGapSummary(authResult.dbUser.id)
        return createApiResponse(summary)
    }
)
