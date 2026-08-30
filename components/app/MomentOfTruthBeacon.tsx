"use client"

import { useEffect } from "react"
import { trackJourneyEvent } from "@/lib/journey/funnel"

/**
 * `moment_of_truth.shown` (§11): fired once per finding per session when a
 * specific, source-backed finding is on screen in the «τώρα» tier. Renders
 * nothing; never fires for a finding the gate rejected (it was never passed in).
 */
export function MomentOfTruthBeacon({ findings }: { findings: Array<{ id: string; tier: string; kind: string }> }) {
    useEffect(() => {
        for (const f of findings) {
            const key = `pw:mot:${f.id}`
            try {
                if (sessionStorage.getItem(key)) continue
                sessionStorage.setItem(key, "1")
            } catch { /* storage unavailable — fire once per mount instead */ }
            trackJourneyEvent("moment_of_truth.shown", { finding_id: f.id, tier: f.tier, kind: f.kind })
        }
    }, [findings])
    return null
}
