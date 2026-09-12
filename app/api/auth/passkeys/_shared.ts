import { z } from "zod"

import { createApiError } from "@/lib/api-utils"
import { passkeysEnabled } from "@/lib/auth/passkeys"

/** The WebAuthn JSON the browser produces; @simplewebauthn/server validates the contents. */
export const webAuthnResponseSchema = z.object({ response: z.record(z.string(), z.unknown()) })

export function passkeysDisabledResponse(): Response | null {
    return passkeysEnabled() ? null : createApiError("PASSKEYS_DISABLED", "Passkeys are not enabled on this deployment", 404)
}

/** One key per user for the passkey ceremonies — a burst here is an attack, not a customer. */
export const passkeyRateLimit = (name: string) => ({
    limit: 20,
    windowMs: 10 * 60 * 1000,
    key: ({ ip, auth }: { ip: string; auth: { dbUser: { id: string } } | null }) => `auth:passkeys:${name}:${auth?.dbUser.id ?? ip}`,
})
