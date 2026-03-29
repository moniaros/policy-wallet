import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { db } from "@/lib/db"

/**
 * GET /api/v1/customers/protection-scores
 *
 * Returns cached protection scores for all of an agent's customers.
 * Uses a single batch query instead of per-customer lookups.
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 10,
            windowMs: 60 * 1000,
            key: ({ auth }) =>
                `customer-scores:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth }) => {
        const agentId = auth!.dbUser.id

        // Verify agent role
        if (!auth!.dbUser.roles?.includes("agent")) {
            return createApiResponse({ scores: [] })
        }

        // Get all customer relationships
        const relationships = await db.customerRelationship.findMany({
            where: {
                agentUserId: agentId,
                status: { in: ["active", "pending_activation"] },
            },
            select: {
                policyholderUserId: true,
                customer: {
                    select: { id: true, name: true },
                },
            },
        })

        const customerIds = relationships.map((r) => r.policyholderUserId)

        // Single batch query for all cached scores
        const cachedScores = customerIds.length > 0
            ? await db.protectionScore.findMany({
                where: { userId: { in: customerIds } },
                select: {
                    userId: true,
                    overallScore: true,
                    gapCount: true,
                    computedAt: true,
                },
            })
            : []

        const scoreMap = new Map(
            cachedScores.map((s) => [s.userId, s])
        )

        const scores = relationships.map((rel) => {
            const cached = scoreMap.get(rel.policyholderUserId)
            return {
                customerId: rel.policyholderUserId,
                customerName: rel.customer.name || "Unknown",
                protectionScore: cached?.overallScore ?? null,
                gapCount: cached?.gapCount ?? 0,
                computedAt: cached?.computedAt?.toISOString() ?? null,
            }
        })

        // Sort: lowest scores first (most at risk)
        scores.sort((a, b) => (a.protectionScore ?? 0) - (b.protectionScore ?? 0))

        return createApiResponse({ scores })
    }
)
