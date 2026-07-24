/**
 * Turns an API error envelope into copy the reader can actually act on.
 *
 * `createApiError(code, message, ...)` builds `message` for developers and logs:
 * "Invalid thread payload", "Failed to list collaboration threads", "Forbidden".
 * Clients were rendering that string directly via
 * `toast.error(json?.error?.message || t.someTranslatedFallback)` — the raw
 * English wins that expression, so on a Greek-default product the translated
 * copy beside it was effectively dead code and users read developer English.
 * A dropped connection was worse: `error.message` is then the browser's own
 * "Failed to fetch".
 *
 * The `code` is the stable, language-independent part of the contract, so map
 * from that and keep the server's `message` for the console.
 */

export type ApiErrorCopy = {
    unauthorized: string
    forbidden: string
    notFound: string
    validation: string
    unavailable: string
    generic: string
}

type ErrorEnvelope = { error?: { code?: string; message?: string } } | null | undefined

/**
 * @param envelope parsed JSON body from an API call
 * @param copy     translated strings for each stable code
 * @param fallback message for this specific operation ("could not load the timeline")
 */
export function apiErrorMessage(
    envelope: ErrorEnvelope,
    copy: ApiErrorCopy,
    fallback?: string
): string {
    switch (envelope?.error?.code) {
        case "UNAUTHORIZED":
            return copy.unauthorized
        case "FORBIDDEN":
            return copy.forbidden
        case "NOT_FOUND":
            return copy.notFound
        case "VALIDATION_ERROR":
        case "BAD_REQUEST":
            return copy.validation
        case "SERVICE_UNAVAILABLE":
            return copy.unavailable
        default:
            // INTERNAL_ERROR and anything unrecognised: the operation-specific
            // line is more useful than "Something went wrong" when we have one.
            return fallback ?? copy.generic
    }
}
