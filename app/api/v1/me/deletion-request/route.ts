import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { db } from "@/lib/db"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

const deletionRequestSchema = z.object({
    legalBasis: z.string().trim().max(256).optional(),
    retentionNotes: z.string().trim().max(1000).optional(),
})

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { body: deletionRequestSchema },
        rateLimit: {
            limit: 3,
            windowMs: 24 * 60 * 60 * 1000,
            key: ({ auth }) => `gdpr:deletion-request:create:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, body }) => {
        const userId = auth!.dbUser.id
        const language = resolveUserLanguage(auth!.dbUser.preferredLanguage)
        const payload = body!

        const existingOpenRequest = await db.deletionRequest.findFirst({
            where: {
                userId,
                status: {
                    in: ["requested", "in_review", "approved", "processing"],
                },
            },
        })

        if (existingOpenRequest) {
            return createApiError(
                "CONFLICT",
                "A deletion request is already in progress",
                409,
                {
                    request_id: existingOpenRequest.id,
                    status: existingOpenRequest.status,
                },
                language
            )
        }

        const request = await db.deletionRequest.create({
            data: {
                userId,
                status: "requested",
                legalBasis: payload.legalBasis || "GDPR_ARTICLE_17",
                retentionNotes: payload.retentionNotes || null,
            },
        })

        return createApiResponse(
            {
                request_id: request.id,
                status: request.status,
                requested_at: request.requestedAt.toISOString(),
                message_key: "compliance.deletion.requested",
            },
            language
        )
    }
)
