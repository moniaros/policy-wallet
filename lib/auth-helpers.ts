import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { logger } from "@/lib/logger"

/**
 * Get the authenticated user from Supabase and the database.
 * Redirects to signin if not authenticated.
 */
export async function getAuthenticatedUser() {
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
}

/**
 * Get the authenticated user from Supabase and the database.
 * Returns null if not authenticated (doesn't redirect).
 */
export async function getAuthenticatedUserOrNull() {
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
}

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
 * Gate is OFF by default and enabled with ENFORCE_EMAIL_VERIFICATION=1 (kept
 * off for the internal demo so testers aren't blocked; flip on before real
 * traffic — see docs/STATUS.md / issue #39). Phone-only signups get a synthetic
 * email that is auto-verified at registration, so they always pass.
 */
export function emailVerificationRequired(
    user: { emailVerified: Date | null } | null | undefined
): boolean {
    if (process.env.ENFORCE_EMAIL_VERIFICATION !== "1") return false
    if (!user) return false
    return !user.emailVerified
}
