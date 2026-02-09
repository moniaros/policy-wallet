"use client"

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
    interface Window {
        dataLayer: unknown[]
        gtag?: (...args: unknown[]) => void
    }
}

function sanitizePayload(payload: AnalyticsPayload = {}) {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    )
}

export function hasGoogleAnalytics() {
    return Boolean(MEASUREMENT_ID)
}

export function trackGoogleEvent(eventName: string, payload: AnalyticsPayload = {}) {
    if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
        return
    }

    window.gtag("event", eventName, sanitizePayload(payload))
}

export function trackGooglePageView(url: string) {
    if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
        return
    }

    window.gtag("event", "page_view", {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
    })
}

