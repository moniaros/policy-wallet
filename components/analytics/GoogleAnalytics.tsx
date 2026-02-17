"use client"

import { useEffect } from "react"
import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { flushQueuedGoogleEvents, hasGoogleAnalytics, trackGooglePageView } from "@/lib/analytics/google-analytics"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const GA_DEBUG_MODE = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === "true"

export function GoogleAnalytics() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const queryString = searchParams.toString()

    useEffect(() => {
        if (!hasGoogleAnalytics() || !pathname) return

        const url = queryString ? `${pathname}?${queryString}` : pathname

        trackGooglePageView(url)
        flushQueuedGoogleEvents()
    }, [pathname, queryString])

    if (!GA_MEASUREMENT_ID) {
        return null
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
                onLoad={() => flushQueuedGoogleEvents()}
            />
            <Script
                id="google-analytics-init"
                strategy="afterInteractive"
                onLoad={() => flushQueuedGoogleEvents()}
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        window.gtag = gtag;
                        gtag('js', new Date());
                        gtag('config', '${GA_MEASUREMENT_ID}', {
                            send_page_view: false,
                            anonymize_ip: true,
                            allow_google_signals: false,
                            debug_mode: ${GA_DEBUG_MODE}
                        });
                    `,
                }}
            />
        </>
    )
}
