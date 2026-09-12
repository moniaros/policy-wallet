import type { AuthenticationResponseJSON } from "@simplewebauthn/server"
import { cookies } from "next/headers"

import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { verifyAuthentication } from "@/lib/auth/passkeys"
import { STEP_UP_COOKIE, STEP_UP_TTL_SECONDS, issueStepUpToken } from "@/lib/auth/step-up"

import { passkeyRateLimit, passkeysDisabledResponse, webAuthnResponseSchema } from "../_shared"

/** Step 2 of the step-up: verify the assertion and issue the proof cookie the proxy reads. */
export const POST = withApiGuard(
    { auth: { mode: "user" }, validation: { body: webAuthnResponseSchema }, rateLimit: { ...passkeyRateLimit("verify") } },
    async ({ auth, body }) => {
        const off = passkeysDisabledResponse()
        if (off) return off
        const result = await verifyAuthentication(auth!.dbUser.id, body!.response as unknown as AuthenticationResponseJSON)
        if (!result.ok) return createApiError("PASSKEY_VERIFICATION_FAILED", result.reason, 401)
        const store = await cookies()
        store.set(STEP_UP_COOKIE, await issueStepUpToken(auth!.supabaseUser.id), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: STEP_UP_TTL_SECONDS,
        })
        return createApiResponse({ verified: true })
    }
)
