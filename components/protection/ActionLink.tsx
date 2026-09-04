"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { JourneyEventPayloadMap } from "@/types/journey-events"

export type ActionKind = JourneyEventPayloadMap["action_started"]["kind"]

/**
 * A link that says what it starts: `action_started {kind, area}` on tap
 * (docs/planning/PERSONAL_RISK_PROFILE.md §J). Everything else is a plain
 * next/link — the destination is the caller's, checked by the dead-link guard
 * at the call site.
 */
export function ActionLink({
    href,
    kind,
    area,
    className,
    children,
    ariaLabel,
}: {
    href: string
    kind: ActionKind
    area: string
    className?: string
    children: ReactNode
    ariaLabel?: string
}) {
    return (
        <Link
            href={href}
            className={className}
            aria-label={ariaLabel}
            data-action={kind}
            onClick={() => trackJourneyEvent("action_started", { kind, area })}
        >
            {children}
        </Link>
    )
}
