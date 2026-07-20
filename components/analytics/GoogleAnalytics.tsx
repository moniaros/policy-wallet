"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import {
    disableGoogleAnalytics,
    flushQueuedGoogleEvents,
    googleAnalyticsAllowed,
    trackGooglePageView,
} from "@/lib/analytics/google-analytics"
import { CONSENT_CHANGED_EVENT } from "@/lib/compliance/consent"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const GA_DEBUG_MODE = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === "true"

export function GoogleAnalytics() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const queryString = searchParams.toString()

    // Starts false on both server and client render: no consent is assumed
    // until the cookie has actually been read in an effect. This doubles as the
    // hydration-safe default, since `document.cookie` does not exist on the server.
    const [consented, setConsented] = useState(false)

    useEffect(() => {
        const sync = () => {
            setConsented((wasConsented) => {
                const isConsented = googleAnalyticsAllowed()
                // Withdrawal: stop sending immediately rather than waiting for
                // the scripts to unmount on the next render.
                if (wasConsented && !isConsented) {
                    disableGoogleAnalytics()
                }
                return isConsented
            })
        }

        sync()

        // Reactivity: the banner dispatches this the moment a choice is saved,
        // so GA starts (or stops) without a reload.
        window.addEventListener(CONSENT_CHANGED_EVENT, sync)
        return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync)
    }, [])

    useEffect(() => {
        if (!consented || !pathname) return

        const url = queryString ? `${pathname}?${queryString}` : pathname

        trackGooglePageView(url)
        flushQueuedGoogleEvents()
    }, [consented, pathname, queryString])

    if (!GA_MEASUREMENT_ID || !consented) {
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
