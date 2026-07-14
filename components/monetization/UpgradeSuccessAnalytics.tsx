"use client"

import { useEffect, useRef } from "react"
import { trackJourneyEvent } from "@/lib/journey/funnel"

/**
 * Client-side tail of the conversion funnel. The server records
 * `conv_checkout_started` and activates the plan; this fires the browser-side
 * completion so the funnel has a client counterpart for the last step and we
 * know which gate the upgrade unlocked.
 */
export function UpgradeSuccessAnalytics({
    plan,
    featureKey,
    billingPeriod,
}: {
    plan?: string
    featureKey?: string
    billingPeriod?: "monthly" | "annual"
}) {
    const emitted = useRef(false)

    useEffect(() => {
        if (emitted.current) return
        emitted.current = true

        trackJourneyEvent("checkout_completed", {
            plan,
            billing_period: billingPeriod,
            feature_requested: featureKey,
        })
        if (featureKey) {
            trackJourneyEvent("feature_unlocked", {
                plan,
                feature_requested: featureKey,
            })
        }
    }, [plan, featureKey, billingPeriod])

    return null
}
