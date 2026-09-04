"use client"

import { useEffect } from "react"

import { trackJourneyEvent } from "@/lib/journey/funnel"

/**
 * Analytics beacons for the attention surfaces — docs/planning/
 * PERSONAL_RISK_PROFILE.md §J. Render nothing; the server components that
 * own the DOM stay server components.
 */

const STARTED_KEY = "pw:risk_assessment_started"
/** Last time the areas list rendered for this browser — `days_since_last_visit`. */
const LAST_VISIT_KEY = "pw:risk_assessment_last_visit"
/**
 * The SAME key the onboarding map uses (app/onboarding/ProtectionProfileFlow.tsx
 * `AREA_CREATED_KEY`): «once per session per area» holds across both surfaces,
 * so an area announced at map time is not announced again on the lens.
 */
const AREA_CREATED_KEY = "pw:onboarding:attention_area_created"

const DAY_MS = 86_400_000

/** Whole days since the stored last visit, or null on a first visit / no storage. Always stamps now. */
function daysSinceLastVisit(now: number): number | null {
    try {
        const raw = window.localStorage.getItem(LAST_VISIT_KEY)
        window.localStorage.setItem(LAST_VISIT_KEY, String(now))
        const last = raw === null ? NaN : Number(raw)
        if (!Number.isFinite(last) || last > now) return null
        return Math.floor((now - last) / DAY_MS)
    } catch {
        return null
    }
}

/** `risk_assessment_started` — once per browser session, on the first render of the areas list. */
export function AssessmentStartedBeacon({ activatedCount }: { activatedCount: number }) {
    useEffect(() => {
        try {
            if (window.sessionStorage.getItem(STARTED_KEY)) return
            window.sessionStorage.setItem(STARTED_KEY, "1")
        } catch {
            // Storage unavailable (private mode, blocked): once per mount is the honest fallback.
        }
        trackJourneyEvent("risk_assessment_started", {
            source: "protection",
            activated_count: activatedCount,
            days_since_last_visit: daysSinceLastVisit(Date.now()),
        })
    }, [activatedCount])
    return null
}

export interface AreaCreatedFact {
    area: string
    importance: string
    confidence: string
    alignment: string
}

/** «Once per session»: the areas already announced, kept across a refresh — same shape as the onboarding map. */
function areasAlreadyAnnounced(): Set<string> {
    try {
        const raw = window.sessionStorage.getItem(AREA_CREATED_KEY)
        const list: unknown = raw ? JSON.parse(raw) : []
        return new Set(Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [])
    } catch {
        return new Set()
    }
}
function rememberAnnounced(areas: Set<string>) {
    try {
        window.sessionStorage.setItem(AREA_CREATED_KEY, JSON.stringify([...areas]))
    } catch {
        /* storage unavailable — the in-memory set still holds for this mount */
    }
}

/** `attention_area_created {area, importance, confidence, alignment}` — once per session per area, on the lens render. */
export function AreasCreatedBeacon({ areas }: { areas: readonly AreaCreatedFact[] }) {
    const key = areas.map((a) => a.area).join(",")
    useEffect(() => {
        const announced = areasAlreadyAnnounced()
        let added = false
        for (const fact of areas) {
            if (announced.has(fact.area)) continue
            announced.add(fact.area)
            added = true
            trackJourneyEvent("attention_area_created", {
                area: fact.area,
                importance: fact.importance,
                confidence: fact.confidence,
                alignment: fact.alignment,
            })
        }
        if (added) rememberAnnounced(announced)
        // The facts travel with the area id; a re-render with the same areas emits nothing.
    }, [key])
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

/**
 * `feature_locked_viewed {feature_requested: "limits", area}` — once per detail
 * view, when a held policy's limits are unread AND this account's tier cannot
 * run the deep analysis that reads them. The payload is the funnel's own
 * `ConversionPayload` shape (types/journey-events.ts), so the feature travels
 * under `feature_requested` like every other locked-state view.
 */
export function LimitsLockedBeacon({ area }: { area: string }) {
    useEffect(() => {
        trackJourneyEvent("feature_locked_viewed", { feature_requested: "limits", screen: "protection_area", area })
    }, [area])
    return null
}
