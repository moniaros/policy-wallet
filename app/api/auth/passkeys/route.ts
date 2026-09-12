import { withApiGuard } from "@/lib/api-guard"
import { createApiResponse } from "@/lib/api-utils"
import { listPasskeys, passkeysEnabled } from "@/lib/auth/passkeys"

/** The signed-in person's own passkeys — ids and dates, never key material. */
export const GET = withApiGuard({ auth: { mode: "user" } }, async ({ auth }) => {
    return createApiResponse({ enabled: passkeysEnabled(), passkeys: passkeysEnabled() ? await listPasskeys(auth!.dbUser.id) : [] })
})
