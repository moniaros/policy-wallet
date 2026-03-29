import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import {
    getActiveRecommendations,
    runGapEngine,
} from "@/lib/services/gap-engine"

/**
 * GET /api/v1/recommendations
 *
 * Returns prioritized coverage recommendations for the authenticated user.
 * Recommendations are generated from:
 * - Profile-based gap detection (risk profile vs portfolio)
 * - Policy-level gap instances (AI-detected per policy)
 *
 * Query params:
 *   ?refresh=true    — Re-run gap engine before returning results
 *   ?ai_insights=true — Include AI-generated risk insights (requires refresh)
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth }) =>
                `recommendations:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, req }) => {
        const userId = auth!.dbUser.id
        const url = new URL(req.url)
        const refresh = url.searchParams.get("refresh") === "true"
        const includeAi = url.searchParams.get("ai_insights") === "true"

        if (refresh) {
            const result = await runGapEngine(userId, {
                includeAiInsights: includeAi,
            })
            return createApiResponse({
                recommendations: result.recommendations,
                total: result.recommendations.length,
                syncStats: result.syncStats,
                aiInsights: result.aiInsights,
            })
        }

        const recommendations = await getActiveRecommendations(userId)
        return createApiResponse({
            recommendations,
            total: recommendations.length,
        })
    }
)
