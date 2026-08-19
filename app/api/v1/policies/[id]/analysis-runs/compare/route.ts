import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import {
    compareAnalysisRuns,
    compareLatestRuns,
} from "@/lib/services/analysis/analysis-comparison"
import { canUserUseFeature } from "@/lib/subscription-limits"
import { getPolicyAccess } from "@/lib/policy-access"

const paramsSchema = z.object({ id: z.string().min(1) })

const querySchema = z.object({
    baseRunId: z.string().optional(),
    compareRunId: z.string().optional(),
})

/**
 * GET /api/v1/policies/:id/analysis-runs/compare
 *
 * Compare two analysis runs for a policy.
 * If baseRunId/compareRunId omitted, compares the two most recent completed runs.
 * Requires Plus+ tier (analysisComparison entitlement).
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: paramsSchema },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `policy:analysis:compare:${auth?.dbUser.id || "anonymous"}:${params.id}`,
        },
    },
    async ({ auth, params, req }) => {
        const authResult = auth!
        const { id: policyId } = params

        // Check entitlement
        const allowed = await canUserUseFeature(authResult.dbUser.id, "analysisComparison")
        if (!allowed && !authResult.dbUser.roles?.includes("admin")) {
            return createApiError(
                "FORBIDDEN",
                "Analysis comparison is available on Plus and Pro plans.",
                403
            )
        }

        // Single authorization path (lib/policy-access.ts).
        const access = await getPolicyAccess(policyId, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        if (!access.exists || !access.canRead) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        // Parse optional query params
        const url = new URL(req.url)
        const baseRunId = url.searchParams.get("baseRunId")
        const compareRunId = url.searchParams.get("compareRunId")

        const result = baseRunId && compareRunId
            ? await compareAnalysisRuns(policyId, baseRunId, compareRunId)
            : await compareLatestRuns(policyId)

        if (!result) {
            return createApiError(
                "NOT_FOUND",
                "Need at least two completed analysis runs to compare.",
                404
            )
        }

        return createApiResponse(result)
    }
)
