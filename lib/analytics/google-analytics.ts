"use client"

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

export function hasGoogleAnalytics() {
    return Boolean(MEASUREMENT_ID)
}

export function flushQueuedGoogleEvents() {
    if (!isGoogleReady()) return

    const queue = getQueue()
    while (queue.length > 0) {
        const queued = queue.shift()
        if (!queued) break
        window.gtag!("event", queued.name, sanitizePayload(queued.payload))
    }
}

export function trackGoogleEvent(eventName: string, payload: AnalyticsPayload = {}) {
    if (!MEASUREMENT_ID || typeof window === "undefined") {
        return
    }

    if (typeof window.gtag !== "function") {
        enqueue("event", eventName, payload)
        return
    }

    window.gtag("event", eventName, sanitizePayload(payload))
}

export function trackGooglePageView(url: string) {
    if (!MEASUREMENT_ID || typeof window === "undefined") {
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
