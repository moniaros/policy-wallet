import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/time"
import type { UploadRejectionReason } from "@/lib/security/file-upload"

/**
 * Localise a file-upload rejection.
 *
 * The server's `REJECTION_MESSAGES` are English-only by design (they are also
 * used for API responses and logs), so every user-facing surface should send
 * the machine-readable `UploadRejectionReason` alongside the prose and localise
 * it here — the same code + details pattern `useLimitMessage` already uses for
 * bulk-import errors.
 *
 * `fallback` is the server's English string: used when the code is missing or
 * unrecognised, so an older client or a new reason still shows something real
 * rather than a blank error.
 */
export function uploadRejectionMessage(
    t: any,
    code: string | null | undefined,
    fallback?: string | null,
    maxBytes: number = MAX_UPLOAD_SIZE_BYTES
): string {
    const template: string | undefined = code
        ? t?.uploadRejection?.[code as UploadRejectionReason]
        : undefined

    if (!template) return fallback || t?.apiErrors?.generic || ""

    // Only {maxMb} is defined today; unknown placeholders collapse to "" rather
    // than leaking a raw "{foo}" into the UI.
    return template.replace(/\{(\w+)\}/g, (_: string, key: string) =>
        key === "maxMb" ? String(Math.floor(maxBytes / (1024 * 1024))) : ""
    )
}
