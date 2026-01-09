"use server"

import { db } from "@/lib/db"

export async function verifyEmailToken(token: string) {
    if (!token) return { success: false, error: "Missing token" }

    const verificationToken = await db.verificationToken.findUnique({
        where: { token }
    })

    if (!verificationToken) {
        return { success: false, error: "Invalid token" }
    }

    if (new Date() > verificationToken.expires) {
        return { success: false, error: "Token expired" }
    }

    const user = await db.user.findUnique({
        where: { email: verificationToken.identifier }
    })

    if (!user) {
        return { success: false, error: "User not found" }
    }

    await db.user.update({
        where: { id: user.id },
        data: {
            emailVerified: new Date(),
            // Ensure they have the correct role just in case
        }
    })

    await db.verificationToken.delete({
        where: { identifier_token: { identifier: verificationToken.identifier, token } }
    })

    return { success: true }
}
