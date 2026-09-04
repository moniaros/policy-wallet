"use client"

import { useEffect } from "react"

import { trackJourneyEvent } from "@/lib/journey/funnel"

/**
 * Analytics beacons for the attention surfaces — docs/planning/
 * PERSONAL_RISK_PROFILE.md §J. Render nothing; the server components that
 * own the DOM stay server components.
 */

const STARTED_KEY = "pw:risk_assessment_started"

/** `risk_assessment_started` — once per browser session, on the first render of the areas list. */
export function AssessmentStartedBeacon({ activatedCount }: { activatedCount: number }) {
    useEffect(() => {
        try {
            if (window.sessionStorage.getItem(STARTED_KEY)) return
            window.sessionStorage.setItem(STARTED_KEY, "1")
        } catch {
            // Storage unavailable (private mode, blocked): once per mount is the honest fallback.
        }
        trackJourneyEvent("risk_assessment_started", { source: "protection", activated_count: activatedCount })
    }, [activatedCount])
    return null
}

/** `risk_area_opened` — every time an area detail mounts. */
export function AreaOpenedBeacon({
    area,
    importance,
    alignment,
    confidence,
}: {
    area: string
    importance: string
    alignment: string
    confidence: string
}) {
    useEffect(() => {
        trackJourneyEvent("risk_area_opened", { area, importance, alignment, confidence })
    }, [area, importance, alignment, confidence])
    return null
}
