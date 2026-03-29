import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { getProtectionScore, runGapEngine, getScoreTier } from "@/lib/services/gap-engine"

/**
 * GET /api/v1/protection-score
 *
 * Returns the unified protection score for the authenticated user.
 * Uses cached score if available and fresh (<24h), otherwise recomputes.
 *
 * Query params:
 *   ?fresh=true  — Force recomputation (e.g., after profile update)
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ auth }) =>
                `protection-score:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, req }) => {
        const userId = auth!.dbUser.id
        const url = new URL(req.url)
        const forceFresh = url.searchParams.get("fresh") === "true"

        if (forceFresh) {
            const result = await runGapEngine(userId)
            return createApiResponse({
                score: result.protectionScore.overallScore,
                tier: result.scoreTier,
                categoryScores: result.protectionScore.categoryScores,
                gapCount: result.protectionScore.gapCount,
                expectedLines: result.protectionScore.expectedLines,
                actualLines: result.protectionScore.actualLines,
                profileCompleteness: result.profileCompleteness,
                profileGaps: result.profileGaps.length,
                recommendations: result.recommendations.length,
                computedAt: new Date().toISOString(),
            })
        }

        const cached = await getProtectionScore(userId)

        if (!cached) {
            return createApiResponse({
                score: 0,
                tier: getScoreTier(0),
                categoryScores: {},
                gapCount: 0,
                expectedLines: [],
                actualLines: [],
                profileCompleteness: 0,
                profileGaps: 0,
                recommendations: 0,
                computedAt: null,
            })
        }

        return createApiResponse({
            score: cached.overallScore,
            tier: getScoreTier(cached.overallScore),
            categoryScores: cached.categoryScores,
            gapCount: cached.gapCount,
            expectedLines: cached.expectedLines,
            actualLines: cached.actualLines,
            computedAt: cached.computedAt.toISOString(),
        })
    }
)
