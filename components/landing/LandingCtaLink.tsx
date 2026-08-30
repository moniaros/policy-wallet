"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"

/**
 * Tiny client island: a signup CTA link that fires the landing analytics
 * click event. Lets the hero and final-CTA sections stay server-rendered.
 */
export function LandingCtaLink({
    href,
    locale,
    location,
    className,
    "aria-label": ariaLabel,
    children,
}: {
    href: string
    locale: LandingLocale
    /** Analytics location tag, e.g. "hero" | "final_cta". */
    location: string
    className?: string
    /** Accessible name for an icon-only CTA (the how-it-works arrows). */
    "aria-label"?: string
    children: ReactNode
}) {
    return (
        <Link
            href={href}
            className={className}
            aria-label={ariaLabel}
            onClick={() =>
                trackLandingEvent("cta_clicked_hero", {
                    locale,
                    cta: "start_free",
                    location,
                })
            }
        >
            {children}
        </Link>
    )
}
