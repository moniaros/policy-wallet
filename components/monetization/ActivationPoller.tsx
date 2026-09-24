"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Spec v2 §21 «activating…»: while the success page could not confirm the
 * plan (the webhook may still be in flight), ask the subscription endpoint
 * every 3 s for up to 60 s and re-render the page the moment a paid plan
 * appears. Renders nothing; the page's own pending copy stays on screen.
 */
export function ActivationPoller() {
    const router = useRouter()
    useEffect(() => {
        let tries = 0
        const id = window.setInterval(async () => {
            tries += 1
            try {
                const res = await fetch("/api/v1/me/subscription", { cache: "no-store" })
                const json = res.ok ? await res.json() : null
                if (json?.data?.plan?.price > 0) { window.clearInterval(id); router.refresh(); return }
            } catch { /* keep polling */ }
            if (tries >= 20) window.clearInterval(id)
        }, 3000)
        return () => window.clearInterval(id)
    }, [router])
    return null
}
