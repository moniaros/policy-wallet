"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { signIn } from "@/auth"
import { generateVerificationToken } from "@/lib/tokens"
import { sendMail } from "@/lib/mail"

const RegisterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
    role: z.enum(["policyholder", "agent"]).default("policyholder")
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export async function registerUser(formData: FormData) {
    const data = Object.fromEntries(formData.entries())
    const validation = RegisterSchema.safeParse(data)

    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors }
    }

    const { name, email, password, role } = validation.data

    try {
        const existingUser = await db.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { success: false, error: "User already exists" }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                roles: role,
                emailVerified: null
            }
        })

        // Generate and send verification email
        const verificationToken = await generateVerificationToken(email)
        const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken.token}`

        await sendMail({
            to: email,
            subject: "Verify your email - PolicyWallet",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0d9488;">Verify your email</h2>
                    <p>Thanks for creating an account on PolicyWallet. Please click the link below to verify your email address.</p>
                    <a href="${verifyUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">Verify Email</a>
                    <p style="color: #666; font-size: 14px; margin-top: 24px;">If you didn't create this account, you can safely ignore this email.</p>
                </div>
            `
        })

        return { success: true }

    } catch (error) {
        console.error("Registration failed:", error)
        if (error instanceof Error) {
            return { success: false, error: error.message }
        }
        return { success: false, error: "An unexpected error occurred during registration." }
    }
}
