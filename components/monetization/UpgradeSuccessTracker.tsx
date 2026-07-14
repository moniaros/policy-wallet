"use client"

import { useEffect } from "react"
import { trackJourneyEvent } from "@/lib/journey/funnel"

/**
 * Fires the post-upgrade funnel events on the success page (a server
 * component can't call the client analytics tracker directly). Rendered only
 * once the subscription is confirmed active.
 */
export function UpgradeSuccessTracker({ feature, plan }: { feature?: string; plan?: string }) {
    useEffect(() => {
        trackJourneyEvent("checkout_completed", {
            plan,
            feature_requested: feature,
            trigger_source: "upgrade_success",
        })
        trackJourneyEvent("upgrade_completed", { tier: plan, source: "upgrade_success" })
        trackJourneyEvent("feature_unlocked", { plan, feature_requested: feature })
    }, [])
    return null
}
