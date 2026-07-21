/**
 * Daily privacy-retention sweep (GDPR storage-limitation, Art. 5(1)(e)) —
 * purges PII that has outlived its purpose and that no user action would
 * otherwise revisit:
 *
 * 1. Data-export snapshots past their 7-day download TTL: the row stays
 *    (request history / accountability) but `payloadJson` — a complete PII
 *    snapshot including policy and billing data — and the download token are
 *    cleared. The [id] GET route purges lazily on access; this catches the
 *    rows nobody ever revisits.
 * 2. Invites older than 90 days past consumption/expiry: `inviteeEmail` is
 *    third-party PII (often someone who never signed up) with no remaining
 *    purpose once the invite is consumed or long-expired.
 *
 * FormSubmission and ActivityLog retention windows need a documented policy
 * decision first — tracked in docs/audits/gdpr-deletion-erasure-2026-07.md.
 */

import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { Prisma } from "@prisma/client"

const INVITE_RETENTION_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get("x-cron-secret")
    const authHeader = req.headers.get("authorization")
    const bearerSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null

    const isCronAuthorized = Boolean(
        cronSecret &&
        (
            (headerSecret && headerSecret === cronSecret) ||
            (bearerSecret && bearerSecret === cronSecret)
        )
    )

    if (!isCronAuthorized) {
        const authCheck = await requireApiUser({ roles: ["admin"] })
        if ("error" in authCheck) return authCheck.error
    }

    try {
        const now = new Date()
        const inviteCutoff = new Date(now.getTime() - INVITE_RETENTION_DAYS * DAY_MS)

        const [purgedExports, purgedInvites] = await Promise.all([
            db.dataExportRequest.updateMany({
                where: {
                    status: { in: ["completed", "expired"] },
                    expiresAt: { lte: now },
                },
                data: {
                    status: "expired",
                    payloadJson: Prisma.JsonNull,
                    downloadToken: null,
                },
            }),
            db.invite.deleteMany({
                where: {
                    OR: [
                        { consumedAt: { lte: inviteCutoff } },
                        { consumedAt: null, expiresAt: { lte: inviteCutoff } },
                    ],
                },
            }),
        ])

        logger("info", "Privacy retention sweep completed", {
            purgedExportPayloads: purgedExports.count,
            purgedInvites: purgedInvites.count,
        })

        return createApiResponse({
            purged_export_payloads: purgedExports.count,
            purged_invites: purgedInvites.count,
        })
    } catch (error) {
        logger("error", "Privacy retention sweep failed", { error })
        return createApiError("INTERNAL_ERROR", "Privacy retention sweep failed", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
