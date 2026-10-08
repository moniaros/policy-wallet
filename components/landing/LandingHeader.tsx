"use client"

import { useEffect } from "react"
import { PublicHeader } from "@/components/public/PublicHeader"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"

interface LandingHeaderProps {
    locale: LandingLocale
    /**
     * Retained for call-site compatibility. The #perks in-page anchor is no
     * longer a global nav item (it is only valid on the homepage); the perks
     * section itself still renders on the landing page when offers exist.
     */
    showPerksLink?: boolean
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
