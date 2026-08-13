import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { logger } from "@/lib/logger"

// Request-scoped memo (React cache): a single render tree calls these from the
// layout, the page, and several server actions/components — each call was a
// fresh Supabase auth round-trip plus a user query. cache() dedupes within one
// request and never leaks across requests.

/**
 * Get the authenticated user from Supabase and the database.
 * Redirects to signin if not authenticated.
 */
export const getAuthenticatedUser = cache(async function getAuthenticatedUser() {
    const supabase = await createClient()

    // Get the current user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect("/auth/signin")
    }

    // Find the user in our database by email
    const dbUser = await db.user.findUnique({
        where: { email: user.email! }
    })

    if (!dbUser) {
        redirect("/auth/signin")
    }

    // Update lastActiveAt — throttle to once per 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (!dbUser.lastActiveAt || dbUser.lastActiveAt < fiveMinutesAgo) {
        db.user.update({
            where: { id: dbUser.id },
            data: { lastActiveAt: new Date() },
        }).catch(() => { /* fire and forget */ })
    }

    return { supabaseUser: user, dbUser }
})

/**
 * Get the authenticated user from Supabase and the database.
 * Returns null if not authenticated (doesn't redirect).
 */
export const getAuthenticatedUserOrNull = cache(async function getAuthenticatedUserOrNull() {
    const supabase = await createClient()

    // Get the current user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    // Find the user in our database by email
    const dbUser = await db.user.findUnique({
        where: { email: user.email! }
    })

    if (!dbUser) {
        return null
    }

    return { supabaseUser: user, dbUser }
})

/**
 * Check if the user is a paying user without redirecting.
 */
export async function getIsPayingUser(dbUser: any) {
    if (dbUser.roles.includes('admin')) return true

    const subscription = await db.subscription.findFirst({
        where: {
            userId: dbUser.id,
            status: 'active'
        },
        include: {
            plan: true
        }
    })

    return subscription ? Number(subscription.plan.price) > 0 : false
}

/**
 * Whether this user must verify their email before accessing the app.
 *
 * Gate is OFF by default (kept off for the internal demo so testers aren't
 * blocked; flip on before real traffic — see docs/STATUS.md / issue #39).
 * Phone-only signups get a synthetic email that is auto-verified at
 * registration, so they always pass.
 *
 * The switch now lives in the feature-flag layer as `auth.enforce_email_
 * verification`, so it can be turned on from /admin/automation/flags without a
 * redeploy. With no database row it still resolves through
 * ENFORCE_EMAIL_VERIFICATION and then to OFF, so the behaviour is unchanged
 * until somebody deliberately changes it.
 */
export async function emailVerificationRequired(
    user: { emailVerified: Date | null } | null | undefined
): Promise<boolean> {
    const { getFlags, flagEnabled } = await import("@/lib/flags/config")
    if (!flagEnabled(await getFlags(), "auth.enforce_email_verification")) return false
    if (!user) return false
    return !user.emailVerified
}
