"use client"

import { hasAnalyticsConsent, readConsentFromDocument } from "@/lib/compliance/consent"

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const MAX_QUEUED_EVENTS = 100

declare global {
    interface Window {
        dataLayer: unknown[]
        gtag?: (...args: unknown[]) => void
        __gaQueue?: Array<{ type: "event" | "page_view"; name: string; payload: AnalyticsPayload }>
    }
}

function sanitizePayload(payload: AnalyticsPayload = {}) {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    )
}

function getQueue() {
    if (typeof window === "undefined") return []
    window.__gaQueue = window.__gaQueue || []
    return window.__gaQueue
}

function enqueue(type: "event" | "page_view", name: string, payload: AnalyticsPayload = {}) {
    const queue = getQueue()
    if (queue.length >= MAX_QUEUED_EVENTS) {
        queue.shift()
    }
    queue.push({ type, name, payload: sanitizePayload(payload) })
}

function isGoogleReady() {
    return Boolean(MEASUREMENT_ID && typeof window !== "undefined" && typeof window.gtag === "function")
}

/** GA is *configured* for this deployment. Says nothing about consent. */
export function hasGoogleAnalytics() {
    return Boolean(MEASUREMENT_ID)
}

/**
 * GA is configured AND the visitor has opted in to the analytics category.
 * Read fresh from the cookie on every call so consent changes take effect
 * immediately, with no cached copy to invalidate.
 */
export function googleAnalyticsAllowed() {
    return hasGoogleAnalytics() && hasAnalyticsConsent(readConsentFromDocument())
}

/**
 * Best-effort teardown when analytics consent is withdrawn.
 *
 * Honest limitation: gtag.js cannot be fully unloaded once it has executed —
 * the script stays parsed in memory. What we can do, and do here, is set
 * Google's documented `ga-disable-<ID>` kill switch so no further hits are
 * sent, drop any queued events, and delete the `_ga*` cookies. Anything
 * already transmitted before withdrawal is out of our hands.
 */
export function disableGoogleAnalytics() {
    if (typeof window === "undefined" || !MEASUREMENT_ID) return

    // Google's opt-out flag; gtag checks it before sending any hit.
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = true

    // Anything buffered pre-withdrawal must never be sent.
    window.__gaQueue = []

    clearGoogleAnalyticsCookies()
}

/** Best-effort `_ga*` cookie removal across the host and its parent domains. */
function clearGoogleAnalyticsCookies() {
    if (typeof document === "undefined") return

    const gaCookieNames = document.cookie
        .split(";")
        .map((entry) => entry.trim().split("=")[0])
        .filter((name) => name.startsWith("_ga"))

    if (gaCookieNames.length === 0) return

    // GA sets cookies on the registrable domain, which we cannot know for sure
    // from the client, so expire each candidate scope: exact host, and every
    // dot-prefixed parent (".example.gr" etc.).
    const hostParts = window.location.hostname.split(".")
    const domainScopes = ["", window.location.hostname]
    for (let index = 0; index < hostParts.length - 1; index += 1) {
        domainScopes.push(`.${hostParts.slice(index).join(".")}`)
    }

    for (const name of gaCookieNames) {
        for (const domain of domainScopes) {
            const domainAttribute = domain ? `; domain=${domain}` : ""
            document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${domainAttribute}`
        }
    }
}

export function flushQueuedGoogleEvents() {
    // Never drain the buffer into GA without consent.
    if (!googleAnalyticsAllowed()) return
    if (!isGoogleReady()) return

    const queue = getQueue()
    while (queue.length > 0) {
        const queued = queue.shift()
        if (!queued) break
        window.gtag!("event", queued.name, sanitizePayload(queued.payload))
    }
}

export function trackGoogleEvent(eventName: string, payload: AnalyticsPayload = {}) {
    if (typeof window === "undefined") {
        return
    }

    // Without consent the event is DROPPED, not queued: buffering pre-consent
    // hits and replaying them on opt-in would still be processing data that was
    // collected without a legal basis.
    if (!googleAnalyticsAllowed()) {
        return
    }

    if (typeof window.gtag !== "function") {
        enqueue("event", eventName, payload)
        return
    }

    window.gtag("event", eventName, sanitizePayload(payload))
}

export function trackGooglePageView(url: string) {
    if (typeof window === "undefined") {
        return
    }

    if (!googleAnalyticsAllowed()) {
        return
    }

    const payload = {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
    }

    if (typeof window.gtag !== "function") {
        enqueue("page_view", "page_view", payload)
        return
    }

    window.gtag("event", "page_view", payload)
}
