import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { authenticationOptions } from "@/lib/auth/passkeys"

import { passkeyRateLimit, passkeysDisabledResponse } from "../_shared"

/** Step 1 of the step-up: a challenge restricted to this person's own credentials. */
export const POST = withApiGuard({ auth: { mode: "user" }, rateLimit: { ...passkeyRateLimit("challenge") } }, async ({ auth }) => {
    const off = passkeysDisabledResponse()
    if (off) return off
    const options = await authenticationOptions(auth!.dbUser.id)
    if (!options) return createApiError("NO_PASSKEY", "No passkey is enrolled for this account", 404)
    return createApiResponse(options)
})
