"use client"

import { track } from "@vercel/analytics"

type LandingEventPayload = Record<string, string | number | boolean | null | undefined>

export function trackLandingEvent(event: string, payload: LandingEventPayload = {}) {
    try {
        track(event, payload)
    } catch {
        // no-op when analytics is unavailable
    }
}
