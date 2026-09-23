import { z } from "zod"

import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { loginOptionsForEmail } from "@/lib/auth/passkeys"

import { passkeysDisabledResponse } from "../../_shared"

/**
 * Spec v2 §19.1 step 2, first half: an ANONYMOUS challenge for the account
 * the email names. Same answer for an unknown address and an account with no
 * passkey, so nothing here says which is which.
 */
export const POST = withApiGuard(
    {
        auth: { mode: "public" },
        validation: { body: z.object({ email: z.string().trim().email() }) },
        rateLimit: { limit: 20, windowMs: 10 * 60 * 1000, key: ({ ip }) => `auth:passkeys:login-options:${ip}` },
    },
    async ({ body }) => {
        const off = passkeysDisabledResponse()
        if (off) return off
        const options = await loginOptionsForEmail(body!.email)
        if (!options) return createApiError("PASSKEY_UNAVAILABLE", "Passkey sign-in is not available for this address", 404)
        return createApiResponse(options)
    }
)
