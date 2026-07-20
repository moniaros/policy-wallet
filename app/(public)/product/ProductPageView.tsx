"use client"

import { useEffect } from "react"
import type { Language } from "@/lib/i18n"
import { trackLandingEvent } from "@/lib/landing/analytics"

/** Renders nothing — fires the product page_view once per locale. */
export function ProductPageView({ language }: { language: Language }) {
    useEffect(() => {
        trackLandingEvent("page_view_product", { locale: language as any })
    }, [language])

    return null
}
