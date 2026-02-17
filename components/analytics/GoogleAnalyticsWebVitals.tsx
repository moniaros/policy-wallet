"use client"

import { useReportWebVitals } from "next/web-vitals"
import { hasGoogleAnalytics, trackGoogleEvent } from "@/lib/analytics/google-analytics"

export function GoogleAnalyticsWebVitals() {
    useReportWebVitals((metric) => {
        if (!hasGoogleAnalytics()) return

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

