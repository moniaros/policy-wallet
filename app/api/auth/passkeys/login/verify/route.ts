import type { AuthenticationResponseJSON } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import { z } from "zod"

import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { verifyLoginForEmail } from "@/lib/auth/passkeys"
import { STEP_UP_COOKIE, STEP_UP_TTL_SECONDS, issueStepUpToken } from "@/lib/auth/step-up"
import { getPostLoginRedirectByRole, sessionRoleClaim } from "@/lib/auth/role-routing"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

import { passkeysDisabledResponse } from "../../_shared"

/**
 * Spec v2 §19.1 step 2, second half: the assertion becomes a Supabase session.
 *
 * The «custom token» approach the owner chose, with Supabase's own primitives
 * rather than a hand-minted JWT: once the WebAuthn assertion verifies against
 * the account's stored credential, the service role generates a magic-link
 * token for that account (`auth.admin.generateLink`), and the SSR client
 * redeems its hash (`auth.verifyOtp`) — which sets the session cookies exactly
 * as a password sign-in would. No password, no email round-trip, no secret in
 * the browser. The step-up cookie is issued in the same response so the proxy
 * does not ask for the passkey a second time.
 */
const bodySchema = z.object({
    email: z.string().trim().email(),
    response: z.record(z.string(), z.unknown()),
})

export const POST = withApiGuard(
    {
        auth: { mode: "public" },
        validation: { body: bodySchema },
        rateLimit: { limit: 20, windowMs: 10 * 60 * 1000, key: ({ ip }) => `auth:passkeys:login-verify:${ip}` },
    },
    async ({ body }) => {
        const off = passkeysDisabledResponse()
        if (off) return off
        const result = await verifyLoginForEmail(body!.email, body!.response as unknown as AuthenticationResponseJSON)
        if (!result.ok) return createApiError("PASSKEY_VERIFICATION_FAILED", result.reason, 401)

        const admin = createAdminClient()
        const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: result.email })
        const tokenHash = link?.properties?.hashed_token
        if (linkError || !tokenHash) {
            logger("error", "passkey login: could not mint a session token", { error: linkError?.message })
            return createApiError("SESSION_MINT_FAILED", "Could not start a session", 500)
        }

        const supabase = await createClient()
        const { data: session, error: otpError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash })
        if (otpError || !session.user) {
            logger("error", "passkey login: session exchange failed", { error: otpError?.message })
            return createApiError("SESSION_MINT_FAILED", "Could not start a session", 500)
        }

        const store = await cookies()
        store.set(STEP_UP_COOKIE, await issueStepUpToken(session.user.id), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: STEP_UP_TTL_SECONDS,
        })
        return createApiResponse({ signedIn: true, redirectTo: getPostLoginRedirectByRole(sessionRoleClaim(session.user)) })
    }
)
