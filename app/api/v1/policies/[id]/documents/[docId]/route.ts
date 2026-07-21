import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { withApiGuard } from "@/lib/api-guard"
import { deleteFile } from "@/lib/storage"
import { sanitizeDisplayName } from "@/lib/security/file-upload"
import { getPolicyAccess } from "@/lib/policy-access"
import { createSignedUrlForStoredObject } from "@/lib/supabase/storage-download"
import { DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS } from "@/lib/constants/time"
import { z } from "zod"

const documentParamsSchema = z.object({
    id: z.string().min(1),
    docId: z.string().min(1),
})

/**
 * GET — authorized document retrieval. The stored fileUrl points into a
 * PRIVATE bucket and is never fetchable directly; every view/download goes
 * through this endpoint, which re-checks authorization (owner, policy-scoped
 * grant, or managing agent — the same rule as the policy pages) and redirects
 * to a fresh SHORT-LIVED signed URL. No caching: each open re-authorizes.
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: documentParamsSchema },
        rateLimit: {
            limit: 60,
            windowMs: 60 * 1000,
            key: ({ auth }) => `policy:document:view:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ req, auth, params }) => {
        const authResult = auth!
        const { id, docId } = params

        const access = await getPolicyAccess(id, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        // "Not found" for anyone who can't read the policy — no existence leak.
        if (!access.exists || !access.canRead) {
            return createApiError("NOT_FOUND", "Document not found", 404)
        }

        const document = await db.policyDocument.findFirst({
            where: { id: docId, policyId: id },
            select: { fileUrl: true },
        })
        if (!document) {
            return createApiError("NOT_FOUND", "Document not found", 404)
        }

        const noStore = { headers: { "Cache-Control": "no-store" } }

        // Local-dev fallback files are app-relative paths, not storage objects.
        if (!document.fileUrl.startsWith("http")) {
            return NextResponse.redirect(new URL(document.fileUrl, req.url), { status: 302, ...noStore })
        }

        const signedUrl = await createSignedUrlForStoredObject(
            document.fileUrl,
            DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS
        )
        if (!signedUrl) {
            logger("error", "Document signed-url generation failed", { docId, policyId: id })
            return createApiError("INTERNAL_ERROR", "Document unavailable", 500)
        }

        return NextResponse.redirect(signedUrl, { status: 302, ...noStore })
    }
)

export const DELETE = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: documentParamsSchema },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `policy:document:delete:${auth?.dbUser.id || "anonymous"}:${params.id}:${params.docId}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const { id, docId } = params

        try {
            // Verify policy ownership and document existence
            const document = await db.policyDocument.findFirst({
                where: {
                    id: docId,
                    policyId: id,
                    policy: { ownerUserId: authResult.dbUser.id }
                },
                include: { policy: true }
            })

            if (!document) return createApiError("NOT_FOUND", "Document not found", 404)

            await db.policyDocument.delete({
                where: { id: docId }
            })

            // Remove the backing storage object too — deleting only the DB row
            // left the file orphaned in the bucket. Best-effort: never fail the
            // request (the record is already gone), just log on failure.
            try {
                await deleteFile(document.fileUrl)
            } catch (storageError) {
                logger('warn', 'Document storage delete failed (row already removed)', {
                    docId,
                    policyId: id,
                    error: storageError instanceof Error ? storageError.message : String(storageError),
                })
            }

            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "DOCUMENT_DELETED",
                    description: `Deleted document ${sanitizeDisplayName(document.fileName)} from policy ${document.policy.policyNumber}`,
                    timestamp: new Date()
                }
            })

            logger('info', 'Document deleted', { docId, policyId: id, userId: authResult.dbUser.id })

            return createApiResponse({ message: "Document deleted successfully" })
        } catch (error) {
            logger('error', 'Document delete failed', { docId, policyId: id, error })
            return createApiError("INTERNAL_ERROR", "Delete failed", 500)
        }
    }
)
