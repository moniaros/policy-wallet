import { describe, expect, it } from "vitest"
import {
    DEFAULT_CATEGORIES,
    hasAnalyticsConsent,
    parseConsentCookie,
    readConsentFromDocument,
    serializeConsentCookie,
    CONSENT_COOKIE_NAME,
    type ConsentCookiePayload,
} from "@/lib/compliance/consent"

function buildConsent(analytics: boolean): ConsentCookiePayload {
    return {
        consentType: "cookie",
        policyVersion: "2026-03",
        locale: "el",
        categories: { necessary: true, analytics, marketing: false },
        acceptedAt: new Date().toISOString(),
    }
}

describe("analytics consent gate", () => {
    it("denies Google Analytics when no consent cookie is stored", () => {
        expect(hasAnalyticsConsent(null)).toBe(false)
        expect(hasAnalyticsConsent(parseConsentCookie(null))).toBe(false)
        expect(hasAnalyticsConsent(parseConsentCookie(""))).toBe(false)
    })

    it("denies Google Analytics when the visitor declined analytics", () => {
        expect(hasAnalyticsConsent(buildConsent(false))).toBe(false)
    })

    it("allows Google Analytics only when analytics is explicitly true", () => {
        expect(hasAnalyticsConsent(buildConsent(true))).toBe(true)
    })

    it("defaults the analytics category to opt-out", () => {
        expect(DEFAULT_CATEGORIES.analytics).toBe(false)
        expect(hasAnalyticsConsent({ ...buildConsent(true), categories: DEFAULT_CATEGORIES })).toBe(false)
    })

    it("fails closed on malformed or partial consent payloads", () => {
        expect(hasAnalyticsConsent(parseConsentCookie(`${CONSENT_COOKIE_NAME}=not-json`))).toBe(false)
        expect(hasAnalyticsConsent({} as ConsentCookiePayload)).toBe(false)
        expect(hasAnalyticsConsent({ categories: {} } as ConsentCookiePayload)).toBe(false)
        // A truthy-but-not-true value must not be accepted as consent.
        expect(hasAnalyticsConsent({ categories: { analytics: "yes" } } as unknown as ConsentCookiePayload)).toBe(false)
    })

    it("reads consent from a real cookie string round-trip", () => {
        const granted = buildConsent(true)
        const cookieHeader = `foo=bar; ${CONSENT_COOKIE_NAME}=${serializeConsentCookie(granted)}; baz=qux`

        expect(hasAnalyticsConsent(parseConsentCookie(cookieHeader))).toBe(true)
    })

    it("reads the browser document cookie (jsdom) and gates on it", () => {
        document.cookie = `${CONSENT_COOKIE_NAME}=${serializeConsentCookie(buildConsent(false))}; path=/`
        expect(hasAnalyticsConsent(readConsentFromDocument())).toBe(false)

        document.cookie = `${CONSENT_COOKIE_NAME}=${serializeConsentCookie(buildConsent(true))}; path=/`
        expect(hasAnalyticsConsent(readConsentFromDocument())).toBe(true)

        // Clean up so the cookie does not leak into other specs.
        document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`
    })
})
