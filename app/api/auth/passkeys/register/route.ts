import type { RegistrationResponseJSON } from "@simplewebauthn/server"

import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { verifyRegistration } from "@/lib/auth/passkeys"

import { passkeyRateLimit, passkeysDisabledResponse, webAuthnResponseSchema } from "../_shared"

/** Step 2 of enrolment: verify the attestation, store the credential, write the claim. */
export const POST = withApiGuard(
    { auth: { mode: "user" }, validation: { body: webAuthnResponseSchema }, rateLimit: { ...passkeyRateLimit("register") } },
    async ({ auth, body }) => {
        const off = passkeysDisabledResponse()
        if (off) return off
        const result = await verifyRegistration(
            { id: auth!.dbUser.id, supabaseUserId: auth!.supabaseUser.id },
            body!.response as unknown as RegistrationResponseJSON
        )
        if (!result.ok) return createApiError("PASSKEY_REGISTRATION_FAILED", result.reason, 400)
        return createApiResponse({ id: result.id, count: result.count })
    }
)
