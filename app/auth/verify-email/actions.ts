"use server"

import { db } from "@/lib/db"
import { createClient } from "@supabase/supabase-js"

export async function verifyEmailToken(token: string, email: string) {
    try {
        if (!token || !email) {
            return { success: false, error: "Missing token or email" }
        }

        // 1. Verify token exists in our database and is valid
        const verificationToken = await db.verificationToken.findFirst({
            where: {
                token,
                identifier: email
            }
        })

        if (!verificationToken) {
            return { success: false, error: "Invalid or expired verification link" }
        }

        if (new Date() > verificationToken.expires) {
            // Clean up expired token
            await db.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: verificationToken.identifier,
                        token
                    }
                }
            }).catch(() => { }) // Ignore delete errors
            return { success: false, error: "Verification link has expired. Please request a new one." }
        }

        // 2. Update local database (Primary Source of Truth for App)
        const dbUser = await db.user.findUnique({
            where: { email: verificationToken.identifier }
        })

        if (!dbUser) {
            return { success: false, error: "User not found" }
        }

        await db.user.update({
            where: { id: dbUser.id },
            data: { emailVerified: new Date() }
        })

        // 3. Update Supabase Auth user (Best Effort via Service Role)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

        if (serviceRoleKey && supabaseUrl) {
            try {
                const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                })

                // List users to find the ID (we need ID to update user)
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

                if (!listError && users) {
                    const supabaseUser = users.find(u => u.email === email)
                    if (supabaseUser) {
                        await supabaseAdmin.auth.admin.updateUserById(
                            supabaseUser.id,
                            { email_confirm: true }
                        )
                    }
                }
            } catch (adminError) {
                console.warn("Non-critical: Failed to update Supabase verification status:", adminError)
            }
        } else {
            console.warn("SUPABASE_SERVICE_ROLE_KEY not found. Skipping Supabase email confirmation.")
        }

        // 4. Delete the used token
        await db.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: verificationToken.identifier,
                    token
                }
            }
        }).catch(() => { })

        return { success: true }
    } catch (error) {
        console.error("Email verification error:", error)
        return { success: false, error: "An unexpected error occurred during verification" }
    }
}
