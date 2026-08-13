import { LEGAL_CONTENT_VERSION } from "@/lib/legal/legal-content"

export const CONSENT_COOKIE_NAME = "pw_cookie_consent"
export const DEFAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export const LEGAL_POLICY_VERSIONS = {
    // Deliberately NOT bumped alongside the 2026.07 cookie-policy revision:
    // the wording changed, the cookies set did not, so re-prompting every
    // visitor would be noise. Bump only when a new cookie category appears.
    cookie: "2026-03",
    terms: LEGAL_CONTENT_VERSION,
    privacy: LEGAL_CONTENT_VERSION,
    ai_processing: "2026-07",
} as const

export type ConsentType = keyof typeof LEGAL_POLICY_VERSIONS

export type ConsentCategories = {
    necessary: boolean
    analytics: boolean
    marketing: boolean
}

export type ConsentCookiePayload = {
    consentType: ConsentType
    policyVersion: string
    locale: "el" | "en"
    categories: ConsentCategories
    acceptedAt: string
}

export const DEFAULT_CATEGORIES: ConsentCategories = {
    necessary: true,
    analytics: false,
    marketing: false,
}

/**
 * Percent-decode a stored consent value, tolerating a DOUBLE-encoded one.
 *
 * Between 2026-03-18 and 2026-08-13 the consents API handed an already
 * `encodeURIComponent`-ed string to `response.cookies.set()`, which encodes
 * again — so every browser that reached the API ended up holding
 * `%257B%2522consentType%2522…`. One decode leaves `%7B%22…`, `JSON.parse`
 * throws, and the reader concludes "no prior consent": the banner came back on
 * every page load and analytics stayed off for people who had opted IN.
 *
 * The writer is fixed, but those cookies live for a year in real browsers, and
 * we already hold the person's answer — re-prompting them for it is noise, not
 * caution. So decode a second time when the first pass hands back something
 * that is still encoded. Bounded at two passes: this recovers the one shape we
 * actually shipped, and never loops on hostile input.
 */
function decodeConsentCookieValue(encoded: string): string | null {
    let value = encoded
    for (let pass = 0; pass < 2; pass++) {
        try {
            value = decodeURIComponent(value)
        } catch {
            // Malformed percent-escape — not a cookie we wrote.
            return null
        }
        if (value.startsWith("{")) return value
    }
    return null
}

export function parseConsentCookie(rawCookieHeader: string | null): ConsentCookiePayload | null {
    if (!rawCookieHeader) return null

    const cookiePart = rawCookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))

    if (!cookiePart) return null
    const encoded = cookiePart.split("=")[1]
    if (!encoded) return null

    const decoded = decodeConsentCookieValue(encoded)
    if (!decoded) return null

    try {
        return JSON.parse(decoded) as ConsentCookiePayload
    } catch {
        return null
    }
}

/**
 * Encode a payload for a context that writes the cookie VALUE itself —
 * `document.cookie`, or a raw `Set-Cookie`/`Cookie` header.
 *
 * Do NOT pass the result to Next's `response.cookies.set()`: that serializer
 * percent-encodes what it is given, and pre-encoding is what produced the
 * double-encoded cookie described above. Hand it the plain JSON string.
 */
export function serializeConsentCookie(payload: ConsentCookiePayload): string {
    return encodeURIComponent(JSON.stringify(payload))
}

/**
 * Browser-side read of the stored consent. Reuses `parseConsentCookie` because
 * `document.cookie` has the same `a=1; b=2` shape as the request Cookie header.
 */
export function readConsentFromDocument(): ConsentCookiePayload | null {
    if (typeof document === "undefined") return null
    return parseConsentCookie(document.cookie)
}

/**
 * The single gating decision for every non-essential analytics tag.
 *
 * Deliberately fails CLOSED: no cookie stored, malformed payload, or a missing
 * `categories` object all mean "no prior consent", so nothing loads. Under
 * ePrivacy/GDPR analytics cookies require PRIOR opt-in, so absence of a signal
 * is a refusal, not a default-allow.
 */
export function hasAnalyticsConsent(consent: ConsentCookiePayload | null): boolean {
    return consent?.categories?.analytics === true
}

/**
 * Dispatched on `window` whenever consent is (re)persisted, so already-mounted
 * components can react without waiting for a page reload.
 */
export const CONSENT_CHANGED_EVENT = "pw:consent-changed"

export function emitConsentChanged(categories: ConsentCategories) {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent<ConsentCategories>(CONSENT_CHANGED_EVENT, { detail: categories }))
}
