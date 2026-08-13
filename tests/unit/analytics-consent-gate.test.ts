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

    it("recovers the choice from a legacy DOUBLE-encoded cookie", () => {
        // What the consents API wrote between 2026-03-18 and 2026-08-13: it
        // handed an already-encoded string to `response.cookies.set()`, which
        // encoded it again. Real browsers hold these for up to a year, and we
        // already have the person's answer — asking again would be noise, and
        // it kept analytics off for people who had opted IN.
        const granted = buildConsent(true)
        const doubleEncoded = encodeURIComponent(serializeConsentCookie(granted))
        expect(doubleEncoded).toContain("%257B")

        const recovered = parseConsentCookie(`${CONSENT_COOKIE_NAME}=${doubleEncoded}`)
        expect(recovered?.categories).toEqual(granted.categories)
        expect(hasAnalyticsConsent(recovered)).toBe(true)
    })

    it("still fails closed on values that are encoded gibberish, not consent", () => {
        expect(parseConsentCookie(`${CONSENT_COOKIE_NAME}=%25`)).toBeNull()
        expect(parseConsentCookie(`${CONSENT_COOKIE_NAME}=${encodeURIComponent("%7Bnope")}`)).toBeNull()
        expect(parseConsentCookie(`${CONSENT_COOKIE_NAME}=${encodeURIComponent(encodeURIComponent("[1,2]"))}`)).toBeNull()
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
