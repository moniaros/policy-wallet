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
 * Check if the user has an active paid subscription.
 * Redirects to account page if not.
 */
export async function requirePayingUser() {
    const { dbUser } = await getAuthenticatedUser()

    // Admins have full access
    if (dbUser.roles.includes('admin')) {
        return { dbUser, subscription: null, isPaid: true }
    }

    const subscription = await db.subscription.findFirst({
        where: {
            userId: dbUser.id,
            status: 'active'
        },
        include: {
            plan: true
        }
    })

    const isPaid = subscription ? Number(subscription.plan.price) > 0 : false

    if (!isPaid) {
        logger('info', 'Access denied to paid feature: Redirecting to upgrade', { userId: dbUser.id })
        redirect("/upgrade?reason=feature_locked")
    }

    return { dbUser, subscription, isPaid: true }
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
