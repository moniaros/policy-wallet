import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { z } from "zod"

// PUBLIC_ENDPOINT_AUTH_STRATEGY: rate_limit + zod_payload_validation + supabase_otp

const magicLinkRequestSchema = z.object({
    email: z.string().email(),
    language: z.enum(["el", "en"]).optional().default("el"),
})

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    const limitCheck = await rateLimit(ip as string, 5, 300000) // 5 attempts per 5 minutes

    if (!limitCheck.success) return limitCheck.error!

    try {
        const { email, language } = magicLinkRequestSchema.parse(await req.json())

        const supabase = await createClient()
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/callback`,
            }
        })

        if (error) throw error

        return createApiResponse({
            message: "Magic link sent to your email",
            expires_in: 900
        }, language)

    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid magic link payload", 400, error.issues)
        }
        console.error("Magic link request failed:", error)
        return createApiError("INTERNAL_ERROR", "Failed to send magic link", 500)
    }
}
