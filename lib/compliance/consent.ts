import { LEGAL_CONTENT_VERSION } from "@/lib/legal/legal-content"

export const CONSENT_COOKIE_NAME = "pw_cookie_consent"
export const DEFAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export const LEGAL_POLICY_VERSIONS = {
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

export function parseConsentCookie(rawCookieHeader: string | null): ConsentCookiePayload | null {
    if (!rawCookieHeader) return null

    const cookiePart = rawCookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))

    if (!cookiePart) return null
    const encoded = cookiePart.split("=")[1]
    if (!encoded) return null

    try {
        return JSON.parse(decodeURIComponent(encoded)) as ConsentCookiePayload
    } catch {
        return null
    }
}

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
