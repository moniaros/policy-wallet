"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { sendMail } from "@/lib/mail"
import { redirect } from "next/navigation"

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

const emailTemplates = {
    el: {
        subject: "Επαλήθευση Email - PolicyWallet",
        greeting: (name: string) => `Γεια σας ${name},`,
        welcome: "Καλώς ήρθατε στο PolicyWallet!",
        thankYou: "Σας ευχαριστούμε που δημιουργήσατε λογαριασμό.",
        verifyPrompt: "Για να ενεργοποιήσετε τον λογαριασμό σας, παρακαλούμε επαληθεύστε τη διεύθυνση email σας κάνοντας κλικ στο παρακάτω κουμπί:",
        buttonText: "Επαλήθευση Email",
        alternativeText: "Εάν το κουμπί δεν λειτουργεί, αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στο πρόγραμμα περιήγησής σας:",
        expiryNote: "Αυτός ο σύνδεσμος θα λήξει σε 24 ώρες.",
        ignoreNote: "Εάν δεν δημιουργήσατε αυτόν τον λογαριασμό, μπορείτε να αγνοήσετε με ασφάλεια αυτό το email.",
        nextStepsPolicyholder: "Μετά την επαλήθευση, μπορείτε να συνδεθείτε και να ξεκινήσετε να προσθέτετε τις ασφάλειές σας.",
        nextStepsAgent: "Μετά την επαλήθευση, μπορείτε να συνδεθείτε και να ξεκινήσετε να διαχειρίζεστε τους πελάτες σας.",
        teamSignature: "Η Ομάδα PolicyWallet"
    },
    en: {
        subject: "Email Verification - PolicyWallet",
        greeting: (name: string) => `Hello ${name},`,
        welcome: "Welcome to PolicyWallet!",
        thankYou: "Thank you for creating an account.",
        verifyPrompt: "To activate your account, please verify your email address by clicking the button below:",
        buttonText: "Verify Email",
        alternativeText: "If the button doesn't work, copy and paste this link into your browser:",
        expiryNote: "This link will expire in 24 hours.",
        ignoreNote: "If you didn't create this account, you can safely ignore this email.",
        nextStepsPolicyholder: "After verification, you can sign in and start adding your policies.",
        nextStepsAgent: "After verification, you can sign in and start managing your customers.",
        teamSignature: "The PolicyWallet Team"
    }
}

export async function redeemInvite(token: string, userId: string) {
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

export async function registerUser(formData: FormData) {
    const data = Object.fromEntries(formData.entries())
    const validation = RegisterSchema.safeParse(data)

    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors }
    }

    const { name, email, password, role, language, token } = validation.data
    const supabase = await createClient()

    try {
        // 1. Sign up with Supabase Auth
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

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
        // Check if placeholder exists
        const existingUser = await db.user.findUnique({ where: { email } })

        let userId = ""

        if (existingUser) {
            // Claim placeholder
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
            const newUser = await db.user.create({
                data: {
                    name,
                    email,
                    roles: role,
                    preferredLanguage: language
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
                    verificationStatus: 'pending'
                }
            })
        }

        // 2c. Redeem Invite if present
        if (token) {
            await redeemInvite(token, userId)
        }

        // 3. Generate verification token with 15-minute expiry
        const crypto = require('crypto')
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

        // Store token in database
        await db.verificationToken.create({
            data: {
                identifier: email,
                token: verificationToken,
                expires: expiresAt
            }
        })

        // 4. Create verification URL with the token and email
        const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`

        // 5. Send ONLY ONE branded email via Brevo with verification button
        const template = emailTemplates[language]
        const nextSteps = role === "agent" ? template.nextStepsAgent : template.nextStepsPolicyholder

        const emailHtml = `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                PolicyWallet
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #0d9488; font-size: 24px; font-weight: 700;">
                                ${template.welcome}
                            </h2>
                            
                            <p style="margin: 0 0 24px; color: #44403c; font-size: 16px; line-height: 1.6;">
                                ${template.greeting(name)}
                            </p>
                            
                            <p style="margin: 0 0 24px; color: #44403c; font-size: 16px; line-height: 1.6;">
                                ${template.thankYou} ${template.verifyPrompt}
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                                            ${template.buttonText}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="margin: 24px 0; color: #78716c; font-size: 14px; line-height: 1.6;">
                                ${template.alternativeText}
                            </p>
                            <p style="margin: 0 0 24px; padding: 12px; background-color: #f5f5f4; border-radius: 8px; word-break: break-all; font-size: 13px; color: #57534e;">
                                ${verificationUrl}
                            </p>
                            
                            <!-- Next Steps -->
                            <div style="margin: 32px 0; padding: 20px; background: linear-gradient(135deg, #f0fdfa 0%, #d1fae5 100%); border-left: 4px solid #0d9488; border-radius: 8px;">
                                <p style="margin: 0; color: #0f766e; font-size: 15px; line-height: 1.6; font-weight: 500;">
                                    ${nextSteps}
                                </p>
                            </div>
                            
                            <!-- Footer Notes -->
                            <p style="margin: 24px 0 0; color: #78716c; font-size: 13px; line-height: 1.6;">
                                <strong>${language === 'el' ? 'Αυτός ο σύνδεσμος θα λήξει σε 15 λεπτά για λόγους ασφαλείας.' : 'This link will expire in 15 minutes for security reasons.'}</strong>
                            </p>
                            <p style="margin: 8px 0 0; color: #78716c; font-size: 13px; line-height: 1.6;">
                                ${template.ignoreNote}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #fafaf9; padding: 24px 40px; text-align: center; border-top: 1px solid #e7e5e4;">
                            <p style="margin: 0 0 8px; color: #57534e; font-size: 14px; font-weight: 600;">
                                ${template.teamSignature}
                            </p>
                            <p style="margin: 0; color: #a8a29e; font-size: 12px;">
                                © ${new Date().getFullYear()} PolicyWallet. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `

        // Send the single branded email with verification link
        await sendMail({
            to: email,
            subject: template.subject,
            html: emailHtml
        })

        return { success: true, email, role }

    } catch (error) {
        console.error("Registration failed:", error)
        if (error instanceof Error) {
            // Check for Prisma unique constraint errors
            if (error.message.includes("Unique constraint")) {
                return { success: false, error: "User already exists" }
            }
            return { success: false, error: error.message }
        }
        return { success: false, error: "An unexpected error occurred during registration." }
    }
}

export async function resendVerificationEmail(email: string, language: 'el' | 'en' = 'el') {
    try {
        // 1. Check if user exists
        const user = await db.user.findUnique({ where: { email } })
        if (!user) {
            return { success: false, error: "User not found" }
        }

        // 2. Check if already verified (via Supabase)
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        // If they're logged in and verified, no need to resend
        if (authUser?.email === email && authUser.email_confirmed_at) {
            return { success: false, error: "Email already verified" }
        }

        // 3. Delete old verification tokens for this email
        await db.verificationToken.deleteMany({
            where: { identifier: email }
        })

        // 4. Generate new verification token
        const crypto = require('crypto')
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        await db.verificationToken.create({
            data: {
                identifier: email,
                token: verificationToken,
                expires: expiresAt
            }
        })

        // 5. Send verification email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`

        const template = emailTemplates[language]
        const role = user.roles.includes('agent') ? 'agent' : 'policyholder'
        const nextSteps = role === "agent" ? template.nextStepsAgent : template.nextStepsPolicyholder

        const emailHtml = `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                PolicyWallet
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #0d9488; font-size: 24px; font-weight: 700;">
                                ${template.welcome}
                            </h2>
                            <p style="margin: 0 0 24px; color: #44403c; font-size: 16px; line-height: 1.6;">
                                ${template.greeting(user.name || 'User')}
                            </p>
                            <p style="margin: 0 0 24px; color: #44403c; font-size: 16px; line-height: 1.6;">
                                ${template.verifyPrompt}
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                                            ${template.buttonText}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 24px 0; color: #78716c; font-size: 14px; line-height: 1.6;">
                                ${template.alternativeText}
                            </p>
                            <p style="margin: 0 0 24px; padding: 12px; background-color: #f5f5f4; border-radius: 8px; word-break: break-all; font-size: 13px; color: #57534e;">
                                ${verificationUrl}
                            </p>
                            <p style="margin: 24px 0 0; color: #78716c; font-size: 13px; line-height: 1.6;">
                                <strong>${language === 'el' ? 'Αυτός ο σύνδεσμος θα λήξει σε 15 λεπτά για λόγους ασφαλείας.' : 'This link will expire in 15 minutes for security reasons.'}</strong>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #fafaf9; padding: 24px 40px; text-align: center; border-top: 1px solid #e7e5e4;">
                            <p style="margin: 0 0 8px; color: #57534e; font-size: 14px; font-weight: 600;">
                                ${template.teamSignature}
                            </p>
                            <p style="margin: 0; color: #a8a29e; font-size: 12px;">
                                © ${new Date().getFullYear()} PolicyWallet. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `

        await sendMail({
            to: email,
            subject: template.subject,
            html: emailHtml
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to resend verification email:", error)
        return { success: false, error: "Failed to send email" }
    }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/signin")
}
