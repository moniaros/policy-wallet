import { LEGAL_CONTENT_VERSION } from "@/lib/legal/legal-content"

export const CONSENT_COOKIE_NAME = "pw_cookie_consent"
export const DEFAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export const LEGAL_POLICY_VERSIONS = {
    cookie: "2026-03",
    terms: LEGAL_CONTENT_VERSION,
    privacy: LEGAL_CONTENT_VERSION,
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
