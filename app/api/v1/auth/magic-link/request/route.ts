import { NextResponse } from "next/server"
import { signIn } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    const limitCheck = rateLimit(ip as string, 5, 300000) // 5 attempts per 5 minutes

    if (!limitCheck.success) return limitCheck.error!

    try {
        const body = await req.json()
        const { email, language = "el" } = body

        if (!email) {
            return createApiError("BAD_REQUEST", "Email is required", 400, null, language)
        }

        await (signIn as any)("email", {
            email,
            redirect: false,
            callbackUrl: "/"
        })

        return createApiResponse({
            message: "Magic link sent to your email",
            expires_in: 900
        }, language)

    } catch (error) {
        console.error("Magic link request failed:", error)
        return createApiError("INTERNAL_ERROR", "Failed to send magic link", 500)
    }
}
