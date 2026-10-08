"use client"

import { useEffect } from "react"
import { PublicHeader } from "@/components/public/PublicHeader"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"

interface LandingHeaderProps {
    locale: LandingLocale
}

/**
 * Homepage header = the canonical PublicHeader plus landing-page analytics.
 * Keeping this thin wrapper lets the landing page fire its page-view + nav-CTA
 * events without special-casing the shared header.
 */
export function LandingHeader({ locale }: LandingHeaderProps) {
    useEffect(() => {
        trackLandingEvent("page_view_landing", {
            locale,
            page_variant: "policywallet_landing_v2",
        })
    }, [locale])

    return (
        <PublicHeader
            locale={locale}
            ctaSource="landing_nav"
            onPrimaryCtaClick={() =>
                trackLandingEvent("cta_clicked_hero", {
                    locale,
                    cta: "start_free",
                    location: "nav",
                })
            }
        />
    )
}
