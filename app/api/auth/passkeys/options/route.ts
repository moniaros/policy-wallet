import { withApiGuard } from "@/lib/api-guard"
import { createApiResponse } from "@/lib/api-utils"
import { registrationOptions } from "@/lib/auth/passkeys"

import { passkeyRateLimit, passkeysDisabledResponse } from "../_shared"

/** Step 1 of enrolment: the challenge the browser will sign. */
export const POST = withApiGuard({ auth: { mode: "user" }, rateLimit: { ...passkeyRateLimit("options") } }, async ({ auth }) => {
    const off = passkeysDisabledResponse()
    if (off) return off
    return createApiResponse(await registrationOptions({ id: auth!.dbUser.id, email: auth!.dbUser.email }))
})
