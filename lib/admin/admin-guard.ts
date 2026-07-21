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
 */
export async function logAdminAction(
    adminUserId: string,
    adminEmail: string,
    actionType: string,
    description: string,
    metadata?: any
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
