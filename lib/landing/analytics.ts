"use client"

import { track } from "@vercel/analytics"
import { trackGoogleEvent } from "@/lib/analytics/google-analytics"

type LandingEventPayload = Record<string, string | number | boolean | null | undefined>

export function trackLandingEvent(event: string, payload: LandingEventPayload = {}) {
    try {
        track(event, payload)
    } catch {
        // no-op when analytics is unavailable
    }

    trackGoogleEvent(event, payload)
}
