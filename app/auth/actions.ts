"use server"

import { z } from "zod"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/email/email-service"
import { sendAdminSignupNotificationEmail } from "@/lib/email/admin-emails"
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
import { isAgentRole } from "@/lib/auth/require-agent"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
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

/**
 * The raw redemption, with the subject supplied by the caller.
 *
 * NOT exported, and it must stay that way. Every export of a "use server" file
 * is a callable endpoint, so an exported `(token, userId)` form is an
 * UNAUTHENTICATED write path: it consumes the invite and writes
 * CustomerRelationship activations and AccessGrant rows for whatever `userId`
 * the caller names. The token was the only thing standing in front of those
 * writes, and a token is a secret that travels in links and inboxes.
 *
 * `registerUser` is why the parameter exists: it redeems for the account it has
 * just created, before that account has a session to read.
 */
async function applyInviteRedemption(token: string, userId: string) {
    const invite = await db.invite.findUnique({ where: { token } })
    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) return

    const isShareInvite = ["share", "policy_share", "access_grant"].includes(invite.inviteType)
    // Policyholder→advisor "connect" invite (inverse of the agent→client signup
    // invite): the invitee becomes the AGENT of the relationship, and — unlike
    // the agent→client signup invite whose relationship is pre-created keyed to
    // the invited id — this one is created here at redeem time, so it must be
    // email-bound like a share invite.
    const isClientAgentInvite =
        invite.inviteType === "signup" && invite.relationshipType === "client_agent"

    // Bind a share/access/client-agent invite to the address it was sent to: a
    // leaked token must not connect/grant whoever opens the link. Check BEFORE
    // consuming so a wrong-recipient click leaves the invite valid for the
    // intended user. (The agent→client signup branch is already email-bound —
    // its relationship was pre-created keyed on the invited user's id.)
    if ((isShareInvite || isClientAgentInvite) && invite.inviteeEmail) {
        const redeemer = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
        const redeemerEmail = redeemer?.email?.trim().toLowerCase()
        if (!redeemerEmail || redeemerEmail !== invite.inviteeEmail.trim().toLowerCase()) {
            return
        }
    }

    await db.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), inviteeUserId: userId },
    })

    if (isClientAgentInvite) {
        // Ensure the redeeming advisor holds the agent role so they can manage
        // the client. The register path already set role=agent (→ idempotent
        // here). For an existing NON-agent account (accepting via login) we add
        // the role, an AgentProfile, and sync the Supabase JWT metadata —
        // effective on their NEXT login, since middleware gates the agent
        // dashboard on the token role. The DB role is the source of truth for
        // server checks either way.
        const redeemer = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, roles: true },
        })
        if (redeemer && !isAgentRole(redeemer.roles)) {
            const nextRoles = [
                ...redeemer.roles.split(",").map((r) => r.trim()).filter(Boolean),
                "agent",
            ].join(",")
            await db.user.update({ where: { id: userId }, data: { roles: nextRoles } })
            await db.agentProfile.upsert({
                where: { userId },
                update: {},
                create: { userId, verificationStatus: "pending" },
            })
            try {
                const { getSupabaseAuthUserByEmail, createAdminClient } = await import("@/lib/supabase/admin")
                if (redeemer.email) {
                    const authUser = await getSupabaseAuthUserByEmail(redeemer.email)
                    if (authUser) {
                        await createAdminClient().auth.admin.updateUserById(authUser.id, {
                            user_metadata: { ...authUser.user_metadata, role: nextRoles },
                        })
                    }
                }
            } catch (error) {
                // Best-effort — never fail the connect over a JWT sync hiccup.
                console.error("Advisor JWT role sync failed", error)
            }
        }

        // Connect: the advisor (redeemer) is the agent; the inviter is the client.
        await db.customerRelationship.upsert({
            where: {
                agentUserId_policyholderUserId: {
                    agentUserId: userId,
                    policyholderUserId: invite.inviterUserId,
                },
            },
            create: {
                agentUserId: userId,
                policyholderUserId: invite.inviterUserId,
                status: "active",
                activationStatus: "activated",
            },
            update: { status: "active", activationStatus: "activated" },
        })
        return
    }

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

    if (isShareInvite && invite.scope) {
        // Self-grant no-op: if the redeemer already OWNS the scoped policy,
        // a grant would be meaningless (owners hold full capabilities) —
        // consume the invite (done above) but mint nothing.
        if (invite.scope.startsWith("policy:")) {
            const scopedPolicyId = invite.scope.slice("policy:".length)
            const scopedPolicy = await db.policy.findUnique({
                where: { id: scopedPolicyId },
                select: { ownerUserId: true },
            })
            if (scopedPolicy?.ownerUserId === userId) return
        }

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

/**
 * Redeem an invite for the CURRENT session user.
 *
 * The subject is taken from the session, never from the caller, so a leaked
 * token can no longer be spent by a stranger — it can only be spent by someone
 * signed in as the account the invite is for. Anonymous callers get nothing,
 * silently, exactly as an expired or already-consumed token does: whether a
 * token exists is not something an unauthenticated caller should be able to
 * probe.
 */
export async function redeemInvite(token: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return
    await applyInviteRedemption(token, authResult.dbUser.id)
}

/**
 * Bilingual auth error. These strings are returned to the client and displayed
 * VERBATIM (setServerError(result.error)), so on the Greek-default app they must
 * be localised at the source — lint:i18n-changed only checks .tsx, so hardcoded
 * English here shipped unflagged.
 */
const authErr = (language: "el" | "en", el: string, en: string) => (language === "el" ? el : en)

export async function registerUser(formData: FormData) {
    // Read language up front — the rate-limit reply below fires before Zod parses it.
    const language: "el" | "en" = formData.get("language") === "en" ? "en" : "el"
    const ip = await getRequestIp()
    const registrationRateLimit = await rateLimit(`auth:register:${ip}`, 5, 15 * 60 * 1000)
    if (!registrationRateLimit.success) {
        return { success: false, error: authErr(language, "Πάρα πολλές προσπάθειες εγγραφής. Δοκιμάστε ξανά σε λίγα λεπτά.", "Too many signup attempts. Please try again in a few minutes.") }
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

    const { name, email, mobileNumber, password, role, token, selectedPlan, selectedBilling } = validation.data
    const normalizedPhone = normalizeGreekMobile(mobileNumber)
    if (!normalizedPhone) {
        return { success: false, error: authErr(language, "Μη έγκυρος αριθμός ελληνικού κινητού", "Invalid Greek mobile number") }
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
            return { success: false, error: authErr(language, "Η εγγραφή απέτυχε. Δοκιμάστε ξανά.", "Registration failed. Please try again.") }
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

        // Internal ops alert for every completed registration. Scheduled
        // with after() and error-swallowed so it can never delay or fail
        // the signup itself.
        const isInvitedActivation = Boolean(existingUser)
        after(async () => {
            await sendAdminSignupNotificationEmail({
                name: displayName,
                email: authEmail,
                phoneNumber: normalizedPhone,
                role,
                language,
                isInvitedActivation,
            }).catch(() => null)
        })

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
            // The account was created moments ago and has no session yet, so
            // this is the one caller that legitimately names its own subject.
            await applyInviteRedemption(token, userId)
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
                return { success: false, error: authErr(language, "Υπάρχει ήδη λογαριασμός με αυτά τα στοιχεία", "User already exists") }
            }
            return { success: false, error: error.message }
        }
        return { success: false, error: authErr(language, "Παρουσιάστηκε μη αναμενόμενο σφάλμα κατά την εγγραφή.", "An unexpected error occurred during registration.") }
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
        return { success: false, error: authErr(language, "Πάρα πολλά αιτήματα email επιβεβαίωσης. Δοκιμάστε ξανά αργότερα.", "Too many verification email requests. Please try again later.") }
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
        return { success: false, error: authErr(language, "Αποτυχία επαναποστολής email επιβεβαίωσης.", "Failed to resend verification email.") }
    }
}

export async function resetPasswordForEmail(email: string, language: "el" | "en" = "en") {
    const normalizedEmail = email.trim().toLowerCase()
    const ip = await getRequestIp()

    const resetRateLimit = await rateLimit(`auth:reset-password:${ip}:${normalizedEmail}`, 5, 15 * 60 * 1000)
    if (!resetRateLimit.success) {
        return { success: false, error: authErr(language, "Πάρα πολλές προσπάθειες επαναφοράς κωδικού. Δοκιμάστε ξανά αργότερα.", "Too many password reset attempts. Please try again later.") }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, error: authErr(language, "Δώστε μια έγκυρη διεύθυνση email.", "Please provide a valid email address.") }
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
        return { success: false, error: authErr(language, "Αποτυχία αποστολής email επαναφοράς κωδικού.", "Failed to send password reset email.") }
    }
}

export async function resetPasswordWithToken(payload: {
    email: string
    token: string
    password: string
    language?: "el" | "en"
}) {
    const language: "el" | "en" = payload.language === "en" ? "en" : "el"
    const email = payload.email.trim().toLowerCase()
    const token = payload.token.trim()
    const password = payload.password

    if (!email || !token) {
        return { success: false, error: authErr(language, "Μη έγκυρο αίτημα επαναφοράς.", "Invalid reset request.") }
    }

    if (password.length < 8) {
        return { success: false, error: authErr(language, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.", "Password must be at least 8 characters.") }
    }

    const tokenValidation = await validatePasswordResetToken(email, token)
    if (!tokenValidation.success) {
        return { success: false, error: tokenValidation.error }
    }

    const supabaseUserId = await findSupabaseUserIdByEmail(email)
    if (!supabaseUserId) {
        return { success: false, error: authErr(language, "Δεν βρέθηκε λογαριασμός για αυτό το αίτημα επαναφοράς.", "Could not find account for this reset request.") }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
        return { success: false, error: authErr(language, "Η διαμόρφωση ταυτοποίησης του διακομιστή είναι ελλιπής.", "Server auth configuration is incomplete.") }
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
