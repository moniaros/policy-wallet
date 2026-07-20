"use client"

import { useReportWebVitals } from "next/web-vitals"
import { googleAnalyticsAllowed, trackGoogleEvent } from "@/lib/analytics/google-analytics"

export function GoogleAnalyticsWebVitals() {
    useReportWebVitals((metric) => {
        // Web vitals go to GA, so they need the same prior consent as any other
        // GA hit. Metrics measured before opt-in are dropped, not replayed.
        if (!googleAnalyticsAllowed()) return

        trackGoogleEvent("web_vitals", {
            metric_name: metric.name,
            metric_id: metric.id,
            metric_value: Math.round(metric.value),
            metric_delta: Math.round(metric.delta),
            metric_rating: metric.rating,
            metric_navigation_type: metric.navigationType,
        })
    })

    return null
}

