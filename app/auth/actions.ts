"use server"

import { z } from "zod"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/email/email-service"
import {
    consumePasswordResetToken,
    generatePasswordResetToken,
    generateVerificationToken,
    validatePasswordResetToken,
} from "@/lib/tokens"
import {
    buildSyntheticEmailFromPhone,
    isSyntheticPhoneEmail,
    normalizeGreekMobile,
} from "@/lib/auth/phone-auth"
import { VALID_PLAN_IDS } from "@/lib/pricing/public-pricing-content"

const RegisterSchema = z.object({
    name: z.preprocess((v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v), z.string().min(1).optional()),
    mobileNumber: z.string().min(1, "Mobile number is required")
        .refine((value) => Boolean(normalizeGreekMobile(value)), "Invalid Greek mobile number"),
    email: z.preprocess((value) => {
        if (typeof value !== "string") return value
        const trimmed = value.trim().toLowerCase()
        return trimmed.length === 0 ? undefined : trimmed
    }, z.string().email("Invalid email").optional()),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
    role: z.enum(["policyholder", "agent"]).default("policyholder"),
    language: z.enum(["el", "en"]).default("el"),
    token: z.string().optional(),
    licenseNumber: z.string().optional(),
    agencyName: z.string().optional(),
    termsAccepted: z.boolean().refine((value) => value === true, {
        message: "You must accept the terms and conditions",
    }),
    marketingConsent: z.boolean().optional(),
    selectedPlan: z.enum(VALID_PLAN_IDS).optional(),
    selectedBilling: z.enum(["monthly", "annual"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
}).refine((data) => {
    if (data.role === "agent") {
        return Boolean(data.email && data.name)
    }
    return true
}, {
    message: "Email and name are required for agents",
    path: ["email"],
})
// Agent signup minimum is name + valid mobile + email; license and agency
// details are collected later during agent onboarding (verification stays a
// non-blocking badge — no admin approval is required to start working).

async function getRequestIp() {
    const headerStore = await headers()
    const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim()
    return forwardedFor || headerStore.get("x-real-ip") || "127.0.0.1"
}

async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) return null

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const { data, error } = await adminClient.auth.admin.listUsers()
    if (error || !data?.users) return null

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase())
    return user?.id || null
}

function getEmailVerificationTemplate(language: "el" | "en", confirmLink: string) {
    if (language === "el") {
        return {
            subject: "Επιβεβαίωση Email - PolicyWallet",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Καλώς ήρθατε στο PolicyWallet</h2>
                    <p>Πατήστε στον σύνδεσμο για να επιβεβαιώσετε τη διεύθυνση email σας.</p>
                    <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Επιβεβαίωση Email</a>
                </div>
            `,
        }
    }

    return {
        subject: "Confirm your Email - PolicyWallet",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to PolicyWallet</h2>
                <p>Please click the link below to confirm your email address.</p>
                <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
            </div>
        `,
    }
}

function getPasswordResetTemplate(language: "el" | "en", resetLink: string) {
    if (language === "el") {
        return {
            subject: "Επαναφορά κωδικού - PolicyWallet",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Επαναφορά κωδικού</h2>
                    <p>Ζητήθηκε επαναφορά κωδικού για τον λογαριασμό σας.</p>
                    <p>Ο σύνδεσμος ισχύει για 30 λεπτά.</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Επαναφορά κωδικού</a>
                </div>
            `,
        }
    }

    return {
        subject: "Reset your password - PolicyWallet",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reset your password</h2>
                <p>A password reset was requested for your account.</p>
                <p>This link expires in 30 minutes.</p>
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset password</a>
            </div>
        `,
    }
}

export async function redeemInvite(token: string, userId: string) {
    const invite = await db.invite.findUnique({ where: { token } })
    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) return

    await db.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), inviteeUserId: userId },
    })

    if (invite.inviteType === "signup") {
        await (db.customerRelationship.updateMany as any)({
            where: {
                agentUserId: invite.inviterUserId,
                policyholderUserId: userId,
            },
            data: { status: "active", activationStatus: "activated" },
        })
        return
    }

    const isShareInvite = ["share", "policy_share", "access_grant"].includes(invite.inviteType)
    if (isShareInvite && invite.scope) {
        const existingGrant = await db.accessGrant.findFirst({
            where: {
                granterUserId: invite.inviterUserId,
                granteeUserId: userId,
                scope: invite.scope,
                status: "active",
            },
            select: { id: true },
        })

        if (!existingGrant) {
            const requestedPermissions = invite.requestedPermissions?.trim()
            await db.accessGrant.create({
                data: {
                    granterUserId: invite.inviterUserId,
                    granteeUserId: userId,
                    scope: invite.scope,
                    permissions: requestedPermissions || "read",
                    status: "active",
                },
            })
        }
    }
}

export async function registerUser(formData: FormData) {
    const ip = await getRequestIp()
    const registrationRateLimit = await rateLimit(`auth:register:${ip}`, 5, 15 * 60 * 1000)
    if (!registrationRateLimit.success) {
        return { success: false, error: "Too many signup attempts. Please try again in a few minutes." }
    }

    const data = Object.fromEntries(formData.entries())
    const processedData = {
        ...data,
        termsAccepted: (data.termsAccepted as string) === "true",
        marketingConsent: (data.marketingConsent as string) === "true",
    }

    const validation = RegisterSchema.safeParse(processedData)
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors }
    }

    const { name, email, mobileNumber, password, role, language, token, selectedPlan, selectedBilling } = validation.data
    const normalizedPhone = normalizeGreekMobile(mobileNumber)
    if (!normalizedPhone) {
        return { success: false, error: "Invalid Greek mobile number" }
    }

    const authEmail = email || buildSyntheticEmailFromPhone(normalizedPhone)
    const isSyntheticEmail = !email
    const displayName = name?.trim()?.length
        ? name.trim()
        : role === "agent"
            ? "Agent User"
            : `Policyholder ${normalizedPhone.slice(-4)}`

    const supabase = await createClient()

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: authEmail,
            password,
            options: {
                data: {
                    full_name: displayName,
                    role,
                    language,
                    phone_number: normalizedPhone,
                    ...(selectedPlan ? { selected_plan: selectedPlan } : {}),
                    ...(selectedBilling ? { selected_billing: selectedBilling } : {}),
                },
            },
        })

        if (authError) {
            return { success: false, error: authError.message }
        }
        if (!authData.user) {
            return { success: false, error: "Registration failed. Please try again." }
        }

        const existingUser = await db.user.findUnique({ where: { email: authEmail } })
        let userId = ""

        if (existingUser) {
            // Phantom rows created by an agent may carry agent-attested AI
            // consent; clear it on activation so the customer decides
            // first-hand in the consent gate.
            const { isAgentAttestedConsent } = await import("@/lib/ai-consent")
            const updated = await db.user.update({
                where: { email: authEmail },
                data: {
                    name: displayName,
                    roles: role,
                    preferredLanguage: language,
                    phoneNumber: normalizedPhone,
                    emailVerified: isSyntheticEmail ? new Date() : existingUser.emailVerified,
                    ...(isAgentAttestedConsent(existingUser.aiProcessingConsentVersion)
                        ? { aiProcessingConsentVersion: null }
                        : {}),
                },
            })
            userId = updated.id
        } else {
            const newUser = await db.user.create({
                data: {
                    name: displayName,
                    email: authEmail,
                    phoneNumber: normalizedPhone,
                    roles: role,
                    preferredLanguage: language,
                    emailVerified: isSyntheticEmail ? new Date() : null,
                },
            })
            userId = newUser.id
        }

        if (role === "agent") {
            await db.agentProfile.upsert({
                where: { userId },
                update: {
                    licenseNumber: validation.data.licenseNumber || "",
                    agencyName: validation.data.agencyName || "",
                    verificationStatus: "pending",
                },
                create: {
                    userId,
                    licenseNumber: validation.data.licenseNumber || "",
                    agencyName: validation.data.agencyName || "",
                    verificationStatus: "pending",
                },
            })
        }

        if (token) {
            await redeemInvite(token, userId)
        }

        if (!isSyntheticEmail && email) {
            const verificationToken = await generateVerificationToken(email)
            const confirmLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken.token}&email=${encodeURIComponent(email)}`
            const template = getEmailVerificationTemplate(language, confirmLink)
            await sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            })
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
        })

        if (signInError) {
            return { success: true, warning: "Account created but auto-login failed. Please sign in manually." }
        }

        const redirectTarget = `/auth/signup/confirmation?role=${role}${email ? `&email=${encodeURIComponent(email)}` : ""}${selectedPlan ? `&plan=${encodeURIComponent(selectedPlan)}` : ""}${selectedBilling ? `&billing=${selectedBilling}` : ""}`
        return { success: true, redirect: redirectTarget }
    } catch (error) {
        console.error("REGISTER_USER_FATAL:", error)
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

export async function resendVerificationEmail(email: string, language: "el" | "en" = "el") {
    const normalizedEmail = email.trim().toLowerCase()

    if (isSyntheticPhoneEmail(normalizedEmail)) {
        return { success: true }
    }

    const ip = await getRequestIp()
    const resendRateLimit = await rateLimit(`auth:resend-verification:${ip}:${normalizedEmail}`, 5, 15 * 60 * 1000)
    if (!resendRateLimit.success) {
        return { success: false, error: "Too many verification email requests. Please try again later." }
    }

    try {
        const verificationToken = await generateVerificationToken(normalizedEmail)
        const confirmLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken.token}&email=${encodeURIComponent(normalizedEmail)}`
        const template = getEmailVerificationTemplate(language, confirmLink)
        const result = await sendEmail({
            to: normalizedEmail,
            subject: template.subject,
            html: template.html,
        })

        if (!result.success) {
            return { success: false, error: result.error || "Failed to send email via provider." }
        }
        return { success: true }
    } catch (error) {
        console.error("Resend verification exception:", error)
        return { success: false, error: "Failed to resend verification email." }
    }
}

export async function resetPasswordForEmail(email: string, language: "el" | "en" = "en") {
    const normalizedEmail = email.trim().toLowerCase()
    const ip = await getRequestIp()

    const resetRateLimit = await rateLimit(`auth:reset-password:${ip}:${normalizedEmail}`, 5, 15 * 60 * 1000)
    if (!resetRateLimit.success) {
        return { success: false, error: "Too many password reset attempts. Please try again later." }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, error: "Please provide a valid email address." }
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        })

        if (!existingUser) {
            return { success: true }
        }

        const resetToken = await generatePasswordResetToken(normalizedEmail)
        const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken.token}&email=${encodeURIComponent(normalizedEmail)}`
        const template = getPasswordResetTemplate(language, resetLink)
        const result = await sendEmail({
            to: normalizedEmail,
            subject: template.subject,
            html: template.html,
        })

        if (!result.success) {
            return { success: false, error: result.error || "Failed to send password reset email." }
        }

        return { success: true }
    } catch (error) {
        console.error("Reset password exception:", error)
        return { success: false, error: "Failed to send password reset email." }
    }
}

export async function resetPasswordWithToken(payload: {
    email: string
    token: string
    password: string
}) {
    const email = payload.email.trim().toLowerCase()
    const token = payload.token.trim()
    const password = payload.password

    if (!email || !token) {
        return { success: false, error: "Invalid reset request." }
    }

    if (password.length < 8) {
        return { success: false, error: "Password must be at least 8 characters." }
    }

    const tokenValidation = await validatePasswordResetToken(email, token)
    if (!tokenValidation.success) {
        return { success: false, error: tokenValidation.error }
    }

    const supabaseUserId = await findSupabaseUserIdByEmail(email)
    if (!supabaseUserId) {
        return { success: false, error: "Could not find account for this reset request." }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
        return { success: false, error: "Server auth configuration is incomplete." }
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const { error } = await adminClient.auth.admin.updateUserById(supabaseUserId, { password })
    if (error) {
        return { success: false, error: error.message }
    }

    await consumePasswordResetToken(email, token)
    return { success: true }
}

export async function updateUserPassword(password: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
            return { success: false, error: error.message }
        }
        return { success: true }
    } catch {
        return { success: false, error: "Failed to update password" }
    }
}
