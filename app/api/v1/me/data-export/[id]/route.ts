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
            key: ({ auth }) => `gdpr:data-export:status:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, params, req }) => {
        const userId = auth!.dbUser.id
        const language = (auth!.dbUser.preferredLanguage as "el" | "en") || "el"
        const requestId = params.id

        const exportRequest = await db.dataExportRequest.findFirst({
            where: {
                id: requestId,
                userId,
            },
        })

        if (!exportRequest) {
            return createApiError("NOT_FOUND", "Export request not found", 404, null, language)
        }

        if (
            exportRequest.status === "completed" &&
            exportRequest.expiresAt &&
            exportRequest.expiresAt.getTime() <= Date.now()
        ) {
            await db.dataExportRequest.update({
                where: { id: exportRequest.id },
                data: { status: "expired" },
            })
            exportRequest.status = "expired"
        }

        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        const wantsDownload = token && exportRequest.downloadToken === token

        if (
            wantsDownload &&
            exportRequest.status === "completed" &&
            exportRequest.payloadJson &&
            exportRequest.expiresAt &&
            exportRequest.expiresAt.getTime() > Date.now()
        ) {
            const fileName = `policywallet-data-export-${exportRequest.id}.json`
            return new Response(JSON.stringify(exportRequest.payloadJson, null, 2), {
                status: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${fileName}"`,
                    "Cache-Control": "private, max-age=0, no-cache",
                },
            })
        }

        return createApiResponse(
            {
                request_id: exportRequest.id,
                status: exportRequest.status,
                requested_at: exportRequest.requestedAt.toISOString(),
                started_at: exportRequest.startedAt?.toISOString() || null,
                completed_at: exportRequest.completedAt?.toISOString() || null,
                expires_at: exportRequest.expiresAt?.toISOString() || null,
                has_download: exportRequest.status === "completed" && !!exportRequest.downloadToken,
                download_url:
                    exportRequest.status === "completed" && exportRequest.downloadToken
                        ? `/api/v1/me/data-export/${exportRequest.id}?token=${exportRequest.downloadToken}`
                        : null,
            },
            language
        )
    }
)
