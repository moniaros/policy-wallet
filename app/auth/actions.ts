"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { signIn } from "@/auth"

const RegisterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["policyholder", "agent"]).default("policyholder")
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
                // Automatically activate for now, or require email verification
                emailVerified: null
            }
        })

        return { success: true }

    } catch (error) {
        console.error("Registration failed:", error)
        return { success: false, error: "Something went wrong" }
    }
}
