import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { db } from "@/lib/db"
import { buildUserDataExportPayload } from "@/lib/services/compliance.service"

const DOWNLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 5,
            windowMs: 60 * 60 * 1000,
            key: ({ auth }) => `gdpr:data-export:create:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth }) => {
        const userId = auth!.dbUser.id
        const language = (auth!.dbUser.preferredLanguage as "el" | "en") || "el"

        const request = await db.dataExportRequest.create({
            data: {
                userId,
                status: "requested",
                requestSource: "self_service",
            },
        })

        try {
            await db.dataExportRequest.update({
                where: { id: request.id },
                data: {
                    status: "processing",
                    startedAt: new Date(),
                },
            })

            const payload = await buildUserDataExportPayload(userId)
            const completedAt = new Date()
            const expiresAt = new Date(completedAt.getTime() + DOWNLOAD_TTL_MS)
            const downloadToken = crypto.randomUUID().replace(/-/g, "")

            const finalized = await db.dataExportRequest.update({
                where: { id: request.id },
                data: {
                    status: "completed",
                    payloadJson: payload as any,
                    completedAt,
                    expiresAt,
                    downloadToken,
                },
            })

            return createApiResponse(
                {
                    request_id: finalized.id,
                    status: finalized.status,
                    requested_at: finalized.requestedAt.toISOString(),
                    completed_at: finalized.completedAt?.toISOString() || null,
                    expires_at: finalized.expiresAt?.toISOString() || null,
                    download_url: `/api/v1/me/data-export/${finalized.id}?token=${downloadToken}`,
                },
                language
            )
        } catch (error) {
            await db.dataExportRequest.update({
                where: { id: request.id },
                data: {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "unknown_error",
                },
            })

            // Internals stay in the DB row / logs — never in the response body.
            return createApiError(
                "GDPR_EXPORT_FAILED",
                "Failed to generate data export",
                500,
                null,
                language
            )
        }
    }
)
