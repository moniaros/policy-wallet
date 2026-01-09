"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()

    try {
        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role,
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

        // 2. Create local User record (Sync)
        // We do this so your existing 'db.user' queries still work.
        // We won't store the password here.
        await db.user.create({
            data: {
                name,
                email,
                roles: role,
                // We likely don't need 'password' or 'emailVerified' here anymore 
                // as Supabase manages it, but schemas might require it. 
                // We'll leave them optional/null if schema permits.
            }
        })

        return { success: true }

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
