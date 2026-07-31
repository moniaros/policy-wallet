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
 * 3. Contact/newsletter form submissions older than 24 months (owner decision,
 *    2026-07-21 review).
 * 4. ActivityLog, split by what the row actually is.
 *
 *    The table holds two different things. Administrator actions — stamped with
 *    `metadata._audit` by logAdminAction — are accountability records, and the
 *    privacy policy allows 5 years for those (owner decision, 2026-07-21
 *    review). Everything else in it is ordinary USER activity: AI questions,
 *    logins, uploads, analyses. The same policy tells readers technical logs are
 *    kept "up to 12 months" / «Έως 12 μήνες», and those rows were being kept for
 *    five years alongside the admin ones.
 *
 *    Splitting the sweep honours both published lines rather than applying the
 *    longer one to everything. The usage meters read this table over day and
 *    month windows, so a 12-month floor does not affect them.
 */

import { authorizeCronRequest } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { Prisma } from "@prisma/client"

const INVITE_RETENTION_DAYS = 90
const FORM_SUBMISSION_RETENTION_DAYS = 730 // 24 months
/** Accountability records — administrator actions. */
const ADMIN_AUDIT_RETENTION_DAYS = 5 * 365
/** Technical/usage logs — everything else in ActivityLog. */
const USER_ACTIVITY_RETENTION_DAYS = 365
const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(req: Request) {
    // Delegates to the shared guard, which compares the secret in constant
    // time. Twelve job routes inlined this block with `===`, which
    // short-circuits at the first differing byte and leaks a prefix oracle
    // through response timing — and they bypassed the helper, so hardening it
    // alone changed nothing here.
    const authError = await authorizeCronRequest(req)
    if (authError) return authError

    try {
        const now = new Date()
        const inviteCutoff = new Date(now.getTime() - INVITE_RETENTION_DAYS * DAY_MS)
        const formCutoff = new Date(now.getTime() - FORM_SUBMISSION_RETENTION_DAYS * DAY_MS)
        const adminAuditCutoff = new Date(now.getTime() - ADMIN_AUDIT_RETENTION_DAYS * DAY_MS)
        const userActivityCutoff = new Date(now.getTime() - USER_ACTIVITY_RETENTION_DAYS * DAY_MS)

        const [
            purgedExports,
            purgedInvites,
            purgedFormSubmissions,
            purgedAdminAudit,
            purgedUserActivity,
        ] = await Promise.all([
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
            db.formSubmission.deleteMany({
                where: { createdAt: { lte: formCutoff } },
            }),
            db.activityLog.deleteMany({
                where: {
                    timestamp: { lte: adminAuditCutoff },
                    metadata: { path: ["_audit"], not: Prisma.DbNull },
                } as any,
            }),
            db.activityLog.deleteMany({
                where: {
                    timestamp: { lte: userActivityCutoff },
                    metadata: { path: ["_audit"], equals: Prisma.DbNull },
                } as any,
            }),
        ])

        logger("info", "Privacy retention sweep completed", {
            purgedExportPayloads: purgedExports.count,
            purgedInvites: purgedInvites.count,
            purgedFormSubmissions: purgedFormSubmissions.count,
            purgedAdminAuditLogs: purgedAdminAudit.count,
            purgedUserActivityLogs: purgedUserActivity.count,
        })

        return createApiResponse({
            purged_export_payloads: purgedExports.count,
            purged_invites: purgedInvites.count,
            purged_form_submissions: purgedFormSubmissions.count,
            purged_admin_audit_logs: purgedAdminAudit.count,
            purged_user_activity_logs: purgedUserActivity.count,
        })
    } catch (error) {
        logger("error", "Privacy retention sweep failed", { error })
        return createApiError("INTERNAL_ERROR", "Privacy retention sweep failed", 500, String(error))
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
