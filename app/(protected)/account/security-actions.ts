"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Security actions that actually do what their labels say.
 *
 * The settings screen used to list "active sessions" from an `ActiveSession`
 * table nothing has ever written outside the seed, and its "sign out
 * everywhere" deleted rows from that empty table — it did not revoke a single
 * Supabase session. Supabase owns the sessions, so these ask Supabase.
 */

/**
 * Ends every session except this browser's. Supabase's `others` scope revokes
 * the other refresh tokens server-side and deliberately leaves the local
 * session alone, which is exactly the promise the button makes.
 */
export async function signOutOtherDevices() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" as const }

    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: "others" })
    if (error) {
        logger("error", "Sign out (others) failed", { error })
        return { error: "SIGN_OUT_FAILED" as const }
    }

    // The legacy table is still erased on account deletion, so leaving stale
    // rows behind would resurface them in an export.
    await db.activeSession.deleteMany({ where: { userId: authResult.dbUser.id } })

    return { success: true as const }
}

/** Ends every session including this one, then drops the user at sign-in. */
export async function signOutEverywhere() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) redirect("/auth/signin")

    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "global" })
    await db.activeSession.deleteMany({ where: { userId: authResult.dbUser.id } })

    redirect("/auth/signin")
}

export type ChangePasswordError =
    | "UNAUTHORIZED"
    | "WEAK_PASSWORD"
    | "SAME_PASSWORD"
    | "WRONG_PASSWORD"
    | "RATE_LIMITED"
    | "PASSWORD_UPDATE_FAILED"

/**
 * Changes the sign-in password.
 *
 * The underlying `updatePassword` action has existed and worked for months
 * with no UI, and it took a new password on its own — an open tab on a shared
 * machine was enough to lock the owner out of their own account. Re-authenticate
 * first.
 *
 * The check runs on a throwaway client with `persistSession: false`: signing in
 * on the request-scoped SSR client would write a second set of session cookies
 * as a side effect of a password check.
 */
export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<{ success: true } | { error: ChangePasswordError }> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }

    const email = authResult.dbUser.email
    if (!email) return { error: "UNAUTHORIZED" }

    if (String(newPassword || "").length < 8) return { error: "WEAK_PASSWORD" }
    if (currentPassword === newPassword) return { error: "SAME_PASSWORD" }

    // Password guessing against a known-good email is the whole attack here.
    const limit = await rateLimit(`account:password-change:${authResult.dbUser.id}`, 5, 15 * 60 * 1000)
    if (!limit.success) return { error: "RATE_LIMITED" }

    const verifier = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: signInError } = await verifier.auth.signInWithPassword({
        email,
        password: currentPassword,
    })
    if (signInError) return { error: "WRONG_PASSWORD" }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(authResult.supabaseUser.id, {
        password: newPassword,
    })
    if (error) {
        logger("error", "Password update failed", { error })
        return { error: "PASSWORD_UPDATE_FAILED" }
    }

    await db.securityEvent.create({
        data: {
            userId: authResult.dbUser.id,
            eventType: "password_change",
            ipAddress: "unknown",
            userAgent: "account-settings",
        },
    })

    revalidatePath("/account/security")
    return { success: true }
}
