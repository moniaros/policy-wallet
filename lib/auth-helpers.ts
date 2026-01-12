import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

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
