"use client"

import { useEffect } from "react"
import Script from "next/script"
import { usePathname } from "next/navigation"
import { hasGoogleAnalytics, trackGooglePageView } from "@/lib/analytics/google-analytics"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalytics() {
    const pathname = usePathname()

    useEffect(() => {
        if (!hasGoogleAnalytics() || !pathname) return

        trackGooglePageView(pathname)
    }, [pathname])

    if (!GA_MEASUREMENT_ID) {
        return null
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script
                id="google-analytics-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        window.gtag = gtag;
                        gtag('js', new Date());
                        gtag('config', '${GA_MEASUREMENT_ID}', {
                            send_page_view: false,
                            anonymize_ip: true
                        });
                    `,
                }}
            />
        </>
    )
}
