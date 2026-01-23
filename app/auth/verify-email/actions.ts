"use server"

import { db } from "@/lib/db"
import { createClient } from "@/lib/supabase/server"

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
            })
            return { success: false, error: "Verification link has expired. Please request a new one." }
        }

        // 2. Verify email with Supabase Auth
        const supabase = await createClient()

        // Use Supabase Admin API to confirm email
        const { data: { user }, error: supabaseError } = await supabase.auth.admin.updateUserById(
            verificationToken.identifier,
            { email_confirm: true }
        )

        if (supabaseError) {
            console.error("Supabase verification error:", supabaseError)
            // Fallback: try to get user by email and update
            const { data: users } = await supabase.auth.admin.listUsers()
            const targetUser = users?.users.find(u => u.email === email)

            if (targetUser) {
                await supabase.auth.admin.updateUserById(
                    targetUser.id,
                    { email_confirm: true }
                )
            } else {
                return { success: false, error: "Unable to verify email. Please contact support." }
            }
        }

        // 3. Update local database
        const dbUser = await db.user.findUnique({
            where: { email: verificationToken.identifier }
        })

        if (dbUser) {
            await db.user.update({
                where: { id: dbUser.id },
                data: { emailVerified: new Date() }
            })
        }

        // 4. Delete the used token
        await db.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: verificationToken.identifier,
                    token
                }
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Email verification error:", error)
        return { success: false, error: "An unexpected error occurred during verification" }
    }
}
