import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { db } from "@/lib/db"

const paramsSchema = z.object({
    id: z.string().min(1),
})

export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: paramsSchema },
        rateLimit: {
            limit: 60,
            windowMs: 60 * 1000,
            key: ({ auth }) => `gdpr:deletion-request:status:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, params }) => {
        const userId = auth!.dbUser.id
        const language = (auth!.dbUser.preferredLanguage as "el" | "en") || "el"

        const request = await db.deletionRequest.findFirst({
            where: {
                id: params.id,
                userId,
            },
        })

        if (!request) {
            return createApiError("NOT_FOUND", "Deletion request not found", 404, null, language)
        }

        return createApiResponse(
            {
                request_id: request.id,
                status: request.status,
                requested_at: request.requestedAt.toISOString(),
                reviewed_at: request.reviewedAt?.toISOString() || null,
                completed_at: request.completedAt?.toISOString() || null,
                legal_basis: request.legalBasis,
                retention_notes: request.retentionNotes,
                operator_notes: request.operatorNotes,
                error_message: request.errorMessage,
            },
            language
        )
    }
)
