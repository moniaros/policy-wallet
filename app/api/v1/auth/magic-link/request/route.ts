import { createClient } from "@/lib/supabase/server"
import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"

// PUBLIC_ENDPOINT_AUTH_STRATEGY: rate_limit + zod_payload_validation + supabase_otp

const magicLinkRequestSchema = z.object({
    email: z.string().email(),
    language: z.enum(["el", "en"]).optional().default("el"),
})

export const POST = withApiGuard(
    {
        auth: { mode: "public" },
        validation: { body: magicLinkRequestSchema },
        rateLimit: {
            limit: 5,
            windowMs: 300000,
            key: ({ ip }) => `auth:magic-link:${ip}`,
        },
    },
    async ({ body }) => {
        const { email, language } = body!

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
    }
)
