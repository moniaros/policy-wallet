import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { withApiGuard } from "@/lib/api-guard"
import { deleteFile } from "@/lib/storage"
import { sanitizeDisplayName } from "@/lib/security/file-upload"
import { getPolicyAccess } from "@/lib/policy-access"
import { signStoredObject, type SignedUrlFailure } from "@/lib/supabase/storage-download"
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

        // Scoped by BOTH ids: a document id from another policy cannot be read
        // through a policy this caller happens to have access to.
        const document = await db.policyDocument.findFirst({
            where: { id: docId, policyId: id },
            select: { fileUrl: true, storageBucket: true, storageKey: true },
        })
        if (!document) {
            return documentError(req, "not_found", { docId, policyId: id })
        }

        const noStore = { headers: { "Cache-Control": "no-store" } }

        // Local-dev fallback files are app-relative paths, not storage objects.
        if (!document.fileUrl.startsWith("http") && !document.storageBucket) {
            return NextResponse.redirect(new URL(document.fileUrl, req.url), { status: 302, ...noStore })
        }

        const outcome = await signStoredObject(document, DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS)
        if (!outcome.ok) {
            // The distinction matters operationally and was previously lost in a
            // single opaque 500: a row whose object is gone from the bucket is a
            // data-integrity incident, storage being unconfigured is a
            // deployment fault, and neither is the reader's problem to decode.
            logger(outcome.reason === "object_missing" ? "error" : "warn", "Document retrieval failed", {
                docId,
                policyId: id,
                reason: outcome.reason,
                hasStorageKey: Boolean(document.storageKey),
            })
            return documentError(req, outcome.reason, { docId, policyId: id })
        }

        return NextResponse.redirect(outcome.url, { status: 302, ...noStore })
    }
)

/**
 * A failure the reader can understand.
 *
 * This endpoint is opened by an anchor and by the preview frame, so a JSON error
 * body lands in a browser tab as a blob of machine text. Browsers get a minimal
 * page; API clients still get JSON. The reason code never reaches either — it is
 * in the log line above, against the document id.
 */
function documentError(
    req: Request,
    reason: SignedUrlFailure | "not_found",
    context: { docId: string; policyId: string }
) {
    const wantsHtml = (req.headers.get("accept") || "").includes("text/html")
    const status = reason === "not_found" || reason === "object_missing" ? 404 : 503

    if (!wantsHtml) {
        return createApiError(
            reason === "not_found" ? "NOT_FOUND" : "DOCUMENT_UNAVAILABLE",
            "Document unavailable",
            status
        )
    }

    // No language cookie exists (the app keeps it in localStorage), so the only
    // signal available server-side is Accept-Language. Greek is the default.
    const english = (req.headers.get("accept-language") || "").toLowerCase().startsWith("en")
    // A row that is gone and an object that is gone are the same fact to the
    // reader, and neither is fixed by trying again — telling them "temporarily,
    // try again" would send them round a loop that cannot succeed. Everything
    // else genuinely may clear.
    const gone = reason === "not_found" || reason === "object_missing"
    const message = gone
        ? (english
            ? "This document is no longer available."
            : "Το έγγραφο δεν είναι πλέον διαθέσιμο.")
        : (english
            ? "This document is temporarily unavailable. Please try again."
            : "Το έγγραφο δεν είναι προσωρινά διαθέσιμο. Δοκιμάστε ξανά.")
    const back = english ? "Back to the policy" : "Επιστροφή στο ασφαλιστήριο"

    const escape = (value: string) =>
        value.replace(/[&<>"']/g, (ch) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string)
        )

    const html = `<!doctype html><html lang="${english ? "en" : "el"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(message)}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#f7f7f5;color:#111;font:500 16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
main{max-width:28rem;text-align:center}p{margin:0 0 1.5rem}
a{display:inline-block;padding:.85rem 1.5rem;border-radius:999px;background:#0f5132;color:#fff;
text-decoration:none;font-weight:700}
@media(prefers-color-scheme:dark){body{background:#0b0b0b;color:#f5f5f5}}</style></head>
<body><main><p>${escape(message)}</p>
<a href="/wallet/${escape(context.policyId)}">${escape(back)}</a></main></body></html>`

    return new NextResponse(html, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })
}

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
