/**
 * Shared admin-action helpers, extracted from app/(protected)/admin/actions.ts
 * so other admin action files (/admin/plans, /admin/partners) can reuse them —
 * "use server" files may only export async server actions, so shared helpers
 * must live outside them.
 *
 * SERVER-ONLY (db, next/headers, Sentry).
 */

import { db } from "@/lib/db"
import { hasAnyRole } from "@/lib/api-auth"
import { headers } from "next/headers"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import * as Sentry from "@sentry/nextjs"

/**
 * ROLE VERIFICATION HELPER
 */
export async function verifyAdminRole() {
    const auth = await getAuthenticatedUserOrNull()

    if (!auth) {
        throw new Error("Unauthorized: Not authenticated")
    }

    const { dbUser } = auth

    // Check if user has admin role (parseRoles — not a raw substring match)
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        Sentry.captureMessage(`Unauthorized admin access attempt by user ${dbUser.id}`, "warning")
        throw new Error("Unauthorized: Admin role required")
    }

    return dbUser
}

/**
 * LOG ADMIN ACTION
 * L2: always captures requestorId (adminUserId), timestamp, and client IP for auditability.
 *
 * `targetUserId` names the DATA SUBJECT the action was about — never the actor,
 * who is already `adminUserId`. It is the column behind
 * `@@index([targetUserId, timestamp])`, which the schema documents as GDPR
 * right-of-access reporting ("who accessed data subject X"). Until Aug 2026
 * this helper had no way to set it, and neither did `logActivity`, so 15 of the
 * 18 places that write an audit row structurally could not say whose data was
 * involved and the index backed nothing. Pass it whenever the action concerns
 * one identifiable person.
 */
export async function logAdminAction(
    adminUserId: string,
    adminEmail: string,
    actionType: string,
    description: string,
    metadata?: any,
    targetUserId?: string | null
) {
    try {
        const reqHeaders = await headers()
        const ip =
            reqHeaders.get("x-forwarded-for")?.split(",")[0].trim() ||
            reqHeaders.get("x-real-ip") ||
            "unknown"

        await db.activityLog.create({
            data: {
                adminUserId,
                adminEmail,
                actionType,
                description,
                targetUserId: targetUserId ?? null,
                metadata: {
                    ...(metadata || {}),
                    _audit: {
                        requestorId: adminUserId,
                        ip,
                        at: new Date().toISOString(),
                    },
                },
                timestamp: new Date()
            }
        })
    } catch (error) {
        Sentry.captureException(error)
        console.error("Failed to log admin action:", error)
    }
}

/**
 * LOG AN ADMIN *READ* OF SOMEONE ELSE'S DATA.
 *
 * Reads were the hole. Every mutating admin action logged; opening a customer's
 * record and reading it logged nothing, because the audit trail had grown up
 * around "what was changed" rather than "what was seen". For a data subject the
 * second question is the one that matters, and Art. 30 asks it directly.
 *
 * `scope` names WHAT was read in stable, greppable terms — "user.contact",
 * "user.billing", "policies.list" — so a reviewer can tell a support agent
 * checking an email address from someone paging through a book of business.
 * Deliberately field CLASSES, not values: an audit row must never become a
 * second copy of the data it is auditing.
 *
 * Best-effort, like every other writer here: an audit failure must not break
 * the page. That is a real limitation, not a virtue — it is why coverage is
 * enforced by a test rather than assumed from the presence of these calls.
 */
export async function logAdminRead(
    admin: { id: string; email: string | null },
    actionType: string,
    description: string,
    options: {
        targetUserId?: string | null
        scope: string[]
        /** True only when the read includes Art. 9 special-category data. */
        includesSpecialCategory?: boolean
        metadata?: Record<string, unknown>
    }
) {
    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        actionType,
        description,
        {
            ...(options.metadata || {}),
            _read: {
                scope: options.scope,
                // Art. 9 data gets its own flag so "who looked at health data"
                // is answerable without re-deriving it from the action name.
                specialCategory: options.includesSpecialCategory === true,
            },
        },
        options.targetUserId ?? null
    )
}
