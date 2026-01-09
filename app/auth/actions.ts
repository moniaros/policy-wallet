"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { sendMail } from "@/lib/mail"

const RegisterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
    role: z.enum(["policyholder", "agent"]).default("policyholder"),
    language: z.enum(["el", "en"]).default("el")
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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

export async function registerUser(formData: FormData) {
    const data = Object.fromEntries(formData.entries())
    const validation = RegisterSchema.safeParse(data)

    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors }
    }

    const { name, email, password, role, language } = validation.data
    const supabase = await createClient()

    try {
        // 1. Sign up with Supabase Auth (disable auto email)
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
                // Disable Supabase's automatic confirmation email
                // We'll send our own branded email instead
            },
        })

        if (authError) {
            console.error("Supabase Auth Error:", authError)
            return { success: false, error: authError.message }
        }

        if (!authData.user) {
            return { success: false, error: "Registration failed. Please try again." }
        }

        // 2. Create local User record (Sync)
        await db.user.create({
            data: {
                name,
                email,
                roles: role,
                preferredLanguage: language
            }
        })

        // 3. Generate verification link manually
        // Supabase creates a token but we need to construct the link ourselves
        // The verification link format from Supabase
        const verificationUrl = `${baseUrl}/auth/verify?token_hash=${authData.user.id}&type=email`

        // 4. Send ONLY ONE branded email via Brevo with verification button
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
                                <strong>${template.expiryNote}</strong>
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
