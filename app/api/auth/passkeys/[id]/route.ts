import { z } from "zod"

import { withApiGuard } from "@/lib/api-guard"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { removePasskey } from "@/lib/auth/passkeys"

import { passkeyRateLimit, passkeysDisabledResponse } from "../_shared"

/** Remove one of the signed-in person's OWN passkeys; the claim follows the table. */
export const DELETE = withApiGuard(
    { auth: { mode: "user" }, validation: { params: z.object({ id: z.string().min(1) }) }, rateLimit: { ...passkeyRateLimit("remove") } },
    async ({ auth, params }) => {
        const off = passkeysDisabledResponse()
        if (off) return off
        const result = await removePasskey({ id: auth!.dbUser.id, supabaseUserId: auth!.supabaseUser.id }, params!.id)
        if (!result.removed) return createApiError("NOT_FOUND", "No such passkey on this account", 404)
        return createApiResponse({ removed: true, count: result.count })
    }
)
