import { createClient } from "@/lib/supabase/server"
import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { signupAllowedFor } from "@/lib/auth/registration-gate"
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

        // Door 3 of 4, and currently a shut one: proxy.ts does not allowlist
        // /api/v1/auth, so an anonymous POST is 307'd to signin before it gets
        // here (verified 2026-09-10), and nothing in the app calls this route.
        // The gate stays anyway — signInWithOtp creates an auth.users row for
        // an unknown address by default, and the day this path is allowlisted
        // or given a caller is not the day to remember that. Refuse with the
        // body a real send returns: telling an anonymous caller "that address
        // is unknown" is email enumeration.
        if (!(await signupAllowedFor(email))) {
            return createApiResponse({
                message: "Magic link sent to your email",
                expires_in: 900
            }, language)
        }

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
