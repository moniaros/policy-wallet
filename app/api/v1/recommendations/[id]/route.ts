import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import {
    dismissRecommendation,
    actionRecommendation,
} from "@/lib/services/gap-engine"

const PatchSchema = z.object({
    action: z.enum(["dismiss", "actioned"]),
    reason: z.string().optional(),
})

/**
 * PATCH /api/v1/recommendations/:id
 *
 * Update a recommendation's status:
 *   { action: "dismiss", reason: "not_relevant" }
 *   { action: "actioned" }
 */
export const PATCH = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ auth }) =>
                `recommendations:patch:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, req, params }) => {
        const userId = auth!.dbUser.id
        const recommendationId = (params as any)?.id

        if (!recommendationId) {
            return createApiError("BAD_REQUEST", "Missing recommendation ID", 400)
        }

        const body = await req.json()
        const parsed = PatchSchema.safeParse(body)

        if (!parsed.success) {
            return createApiError(
                "BAD_REQUEST",
                "Invalid request body",
                400
            )
        }

        let result: { count: number }
        if (parsed.data.action === "dismiss") {
            result = await dismissRecommendation(
                recommendationId,
                userId,
                parsed.data.reason || "user_dismissed"
            )
        } else {
            result = await actionRecommendation(recommendationId, userId)
        }

        if (result.count === 0) {
            return createApiError(
                "NOT_FOUND",
                "Recommendation not found or already processed",
                404
            )
        }

        // Recorded on the analytics channel, not delivered: notifying someone
        // about their own click is noise. But a dismissal is the clearest
        // signal a customer ever gives us — "I have considered this and it is
        // not for me" — and the advisory surfaces need it on the record.
        const { emit } = await import("@/lib/notifications/dispatch")
        await emit({
            event: parsed.data.action === "dismiss" ? "recommendation_dismissed" : "recommendation_accepted",
            userId,
            title:
                parsed.data.action === "dismiss"
                    ? "Recommendation dismissed"
                    : "Recommendation actioned",
            message: parsed.data.reason || parsed.data.action,
            relatedObjectType: "recommendation",
            relatedObjectId: recommendationId,
            // `result.count === 0` already blocks a repeat, so the key only has
            // to survive two requests racing the same transition.
            dedupeKey: `recommendation:${recommendationId}:${parsed.data.action}`,
        })

        return createApiResponse({ success: true })
    }
)
