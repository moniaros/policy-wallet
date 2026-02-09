"use client"

import { track } from "@vercel/analytics"
import type { JourneyEventName, JourneyEventPayloadMap } from "@/types/journey-events"

type JourneyPayload<T extends JourneyEventName> = JourneyEventPayloadMap[T]

export function trackJourneyEvent<T extends JourneyEventName>(
    event: T,
    payload: JourneyPayload<T>
) {
    try {
        track(event, payload)
    } catch {
        // no-op when analytics is unavailable
    }
}
