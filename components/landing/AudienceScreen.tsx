"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { Wallet, Users } from "lucide-react"
import { homepagePanelsCopy } from "@/lib/i18n/homepage-panels"
import type { LandingLocale } from "@/types/landing-content"
import styles from "./homepage-panels.module.css"

// The application preview is a below-fold enhancement. Keep its application
// dependencies out of the initial homepage bundle and load before it is seen.
const Content = dynamic(() => import("./AudienceScreenContent"), { ssr: false })
export function AudienceScreen({ locale, kind }: { locale: LandingLocale; kind: "wallet" | "agent" }) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    const copy = homepagePanelsCopy[locale]
    const previewLabel = kind === "wallet" ? copy.walletPreview : copy.agentPreview
    const Icon = kind === "wallet" ? Wallet : Users
    useEffect(() => {
        const element = ref.current
        if (!element) return
        if (!("IntersectionObserver" in window)) { setVisible(true); return }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
        }, { rootMargin: "600px" })
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    return <div ref={ref} className={styles.screen} role="img" aria-label={previewLabel}>
        <div className={styles.screenFallback} aria-hidden="true"><Icon size={48} strokeWidth={1.2} /><span>{kind === "wallet" ? copy.walletFallback : copy.agentFallback}</span></div>
        {visible && <div className={styles.screenLive} data-app-preview={kind}><Content locale={locale} kind={kind} /></div>}
    </div>
}
