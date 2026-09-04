"use client"

import Link from "next/link"
import { useEffect, useRef, type ComponentProps, type MouseEvent, type ReactNode } from "react"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { JourneyEventPayloadMap } from "@/types/journey-events"

/**
 * The two recommendation events of docs/planning/PERSONAL_RISK_PROFILE.md §J,
 * as the only client-side seam the dashboard's server-rendered cards need.
 *
 *   recommendation_viewed {rule_id, area} — once per RULE ID per mount, when
 *   the surface is actually seen (IntersectionObserver; on mount where the
 *   observer does not exist). A re-render with the same rules emits nothing;
 *   two findings from one rule count as one view of that rule.
 *
 *   action_started {kind, area} — on the CTA, with the kind the CTA's purpose
 *   names, never the destination: review_finding / contact_advisor /
 *   check_first_policy / answer_questions / prevention.
 *
 * Nothing here renders copy; every string still arrives from the server, so
 * the cards stay server components and the i18n guards keep their universe.
 * Guarded by tests/unit/recommendation-analytics.test.tsx.
 */

export type ActionKind = JourneyEventPayloadMap["action_started"]["kind"]

export interface ViewedRecommendation {
    /** The rule (or catalogue risk) that produced the recommendation. */
    ruleId: string
    /** Attention area id (lib/protection/domains.ts), when the rule names one. */
    area?: string
}

export function RecommendationSurface({
    items,
    children,
    className,
}: {
    items: readonly ViewedRecommendation[]
    children: ReactNode
    className?: string
}) {
    const ref = useRef<HTMLDivElement>(null)
    // Per mount, not per render: the set survives re-renders and dies with the element.
    const emitted = useRef(new Set<string>())
    const key = items.map((item) => `${item.ruleId}${item.area ?? ""}`).join("")

    useEffect(() => {
        const emit = () => {
            for (const item of items) {
                if (emitted.current.has(item.ruleId)) continue
                emitted.current.add(item.ruleId)
                trackJourneyEvent("recommendation_viewed", { rule_id: item.ruleId, area: item.area })
            }
        }
        const el = ref.current
        if (!el || typeof IntersectionObserver === "undefined") {
            emit()
            return
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return
                emit()
                observer.disconnect()
            },
            { threshold: 0.25 }
        )
        observer.observe(el)
        return () => observer.disconnect()
        // `key` is the items' identity; a new list re-observes, the same list does not.
    }, [key])

    return (
        <div ref={ref} className={className} data-recommendation-surface="">
            {children}
        </div>
    )
}

/** A CTA that records what the person set out to do, then navigates as a plain link. */
export function ActionLink({
    kind,
    area,
    onClick,
    ...props
}: ComponentProps<typeof Link> & { kind: ActionKind; area?: string }) {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        trackJourneyEvent("action_started", { kind, area })
        onClick?.(event)
    }
    return <Link {...props} data-action-kind={kind} onClick={handleClick} />
}
