"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { rateLimit } from "@/lib/rate-limit"
// sendMail removed
import { redirect } from "next/navigation"

// ... (Schema remains)
const RegisterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
    role: z.enum(["policyholder", "agent"]).default("policyholder"),
    language: z.enum(["el", "en"]).default("el"),
    token: z.string().optional(),
    // Agent-specific fields
    licenseNumber: z.string().optional(),
    agencyName: z.string().optional(),
    // Compliance
    termsAccepted: z.boolean().refine((val) => val === true, {
        message: "You must accept the terms and conditions"
    }),
    marketingConsent: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
}).refine((data) => {
    // If role is agent, require license and agency
    if (data.role === "agent") {
        return data.licenseNumber && data.licenseNumber.length > 0 &&
            data.agencyName && data.agencyName.length > 0
    }
    return true
}, {
    message: "License Number and Agency Name are required for agents",
    path: ["licenseNumber"]
})

export async function redeemInvite(token: string, userId: string) {
    // ... (keep existing implementation)
    const invite = await db.invite.findUnique({ where: { token } })
    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) return

    // Mark consumed
    await db.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), inviteeUserId: userId }
    })

    if (invite.inviteType === 'signup') {
        // Agent invited Customer
        await (db.customerRelationship.updateMany as any)({
            where: {
                agentUserId: invite.inviterUserId,
                policyholderUserId: userId
            },
            data: { status: 'active', activationStatus: 'activated' }
        })
    } else if (invite.inviteType === 'share' && invite.scope) {
        // Policy Share
        await db.accessGrant.create({
            data: {
                granterUserId: invite.inviterUserId,
                granteeUserId: userId,
                scope: invite.scope,
                permissions: 'read',
                status: 'active'
            }
        })
    }
}

import { generateVerificationToken } from "@/lib/tokens"
import { sendEmail } from "@/lib/email/email-service"

async function getRequestIp() {
    const headerStore = await headers()
    const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim()
    return forwardedFor || headerStore.get("x-real-ip") || "127.0.0.1"
}

// ... (keep existing imports)

// ... (keep RegisterSchema)

// ... (keep redeemInvite)

export async function registerUser(formData: FormData) {
    const ip = await getRequestIp()
    const registrationRateLimit = await rateLimit(`auth:register:${ip}`, 5, 15 * 60 * 1000)
    if (!registrationRateLimit.success) {
        return { success: false, error: "Too many signup attempts. Please try again in a few minutes." }
    }

    const data = Object.fromEntries(formData.entries())

    //Convert checkbox strings to booleans
    const processedData = {
        ...data,
        termsAccepted: (data.termsAccepted as string) === 'true',
        marketingConsent: (data.marketingConsent as string) === 'true'
    }

    const validation = RegisterSchema.safeParse(processedData)

    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors }
    }

    const { name, email, password, role, language, token } = validation.data
    const supabase = await createClient()

    try {
        // 1. Sign up with Supabase Auth
        // NOTE: "Enable Email Confirmations" MUST be disabled in Supabase Project Settings
        // for this flow to allow immediate login.
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                    language: language
                },
            },
        })

        if (authError) {
            console.error("Supabase Auth Error:", authError)
            return { success: false, error: authError.message }
        }

        if (!authData.user) {
            return { success: false, error: "Registration failed. Please try again." }
        }

        // 2. Create or Update local User record (Sync)
        const existingUser = await db.user.findUnique({ where: { email } })
        let userId = ""

        if (existingUser) {
            // Claim placeholder (if functionality exists)
            const updated = await db.user.update({
                where: { email },
                data: {
                    name,
                    roles: role,
                    preferredLanguage: language
                }
            })
            userId = updated.id
        } else {
            // Create new user
            const newUser = await db.user.create({
                data: {
                    name,
                    email,
                    roles: role,
                    preferredLanguage: language,
                    emailVerified: null // Explicitly unverified
                }
            })
            userId = newUser.id
        }

        // 2b. Create AgentProfile if role is agent
        if (role === 'agent') {
            await db.agentProfile.create({
                data: {
                    userId: userId,
                    licenseNumber: validation.data.licenseNumber || '',
                    agencyName: validation.data.agencyName || '',
                    verificationStatus: 'pending' // Agents still need verification, but they should be able to login
                }
            })
        }

        // 2c. Redeem Invite if present
        if (token) {
            await redeemInvite(token, userId)
        }

        // 3. Manual Email Verification (Brevo)
        try {
            const verificationToken = await generateVerificationToken(email)
            const confirmLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken.token}&email=${encodeURIComponent(email)}`

            const subject = language === 'el' ? 'Επιβεβαίωση Email - PolicyWallet' : 'Confirm your Email - PolicyWallet'
            const html = language === 'el'
                ? `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Καλώς ήρθατε στο PolicyWallet!</h2>
                    <p>Σας ευχαριστούμε για την εγγραφή σας. Για να ολοκληρώσετε τη διαδικασία και να επαληθεύσετε το email σας, κάντε κλικ στον παρακάτω σύνδεσμο:</p>
                    <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Επιβεβαίωση Email</a>
                    <p style="margin-top: 24px; font-size: 12px; color: #666;">Αν δεν εγγραφήκατε εσείς, αγνοήστε αυτό το email.</p>
                   </div>`
                : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to PolicyWallet!</h2>
                    <p>Thank you for signing up. To complete the process and verify your email address, please click the link below:</p>
                    <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
                    <p style="margin-top: 24px; font-size: 12px; color: #666;">If you didn't sign up, please ignore this email.</p>
                   </div>`

            await sendEmail({
                to: email,
                subject,
                html,
                from: '"PolicyWallet" <noreply@policyholder.gr>' // Custom sender
            })
        } catch (emailError) {
            console.error("Failed to send manual verification email:", emailError)
            // Continue flow, user can resend later
        }

        // 4. AUTO-LOGIN (Skip Email Verification Block)
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) {
            console.error("Auto-login failed:", signInError)
            return { success: true, warning: "Account created but auto-login failed. Please check email." }
        }

        return { success: true, redirect: "/onboarding" }

    } catch (error) {
        console.error("Registration failed:", error)
        if (error instanceof Error) {
            if (error.message.includes("Unique constraint")) {
                return { success: false, error: "User already exists" }
            }
            return { success: false, error: error.message }
        }
        return { success: false, error: "An unexpected error occurred during registration." }
    }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/signin")
}

export async function resendVerificationEmail(email: string, language: string = 'el') {
    const ip = await getRequestIp()
    const resendRateLimit = await rateLimit(`auth:resend-verification:${ip}:${email.toLowerCase()}`, 5, 15 * 60 * 1000)
    if (!resendRateLimit.success) {
        return { success: false, error: "Too many verification email requests. Please try again later." }
    }

    try {
        const verificationToken = await generateVerificationToken(email)
        const confirmLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken.token}&email=${encodeURIComponent(email)}`

        const subject = language === 'el' ? 'Επιβεβαίωση Email - PolicyWallet' : 'Confirm your Email - PolicyWallet'
        const html = language === 'el'
            ? `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Επιβεβαίωση Email</h2>
                <p>Παρακαλώ κάντε κλικ στον παρακάτω σύνδεσμο για να επιβεβαιώσετε το email σας:</p>
                <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Επιβεβαίωση Email</a>
               </div>`
            : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Email</h2>
                <p>Please click the link below to confirm your email address:</p>
                <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
               </div>`

        const result = await sendEmail({ to: email, subject, html })

        if (!result.success) {
            return { success: false, error: "Failed to send email via provider" }
        }

        return { success: true }
    } catch (error) {
        console.error("Resend exception:", error)
        return { success: false, error: "Failed to resend email" }
    }
}

export async function resetPasswordForEmail(email: string) {
    const ip = await getRequestIp()
    const resetRateLimit = await rateLimit(`auth:reset-password:${ip}:${email.toLowerCase()}`, 5, 15 * 60 * 1000)
    if (!resetRateLimit.success) {
        return { success: false, error: "Too many password reset attempts. Please try again later." }
    }

    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/callback?next=/auth/reset-password`,
        })

        if (error) {
            console.error("Reset password error:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error("Reset password exception:", error)
        return { success: false, error: "Failed to send password reset email" }
    }
}

export async function updateUserPassword(password: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update password" }
    }
}
