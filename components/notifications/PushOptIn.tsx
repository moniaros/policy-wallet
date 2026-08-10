"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { detectPushSupport, subscribeToPush, unsubscribeFromPush } from "@/lib/push/register"

type State = "checking" | "unsupported" | "unavailable" | "off" | "on" | "denied" | "working"

/**
 * Push opt-in, as a control the customer chooses rather than a prompt that
 * ambushes them.
 *
 * A push permission prompt is a ONE-SHOT: a browser that has been denied will
 * not ask again, so firing it on page load permanently costs the channel for
 * that person. It therefore lives behind an explicit button in Settings, and
 * `subscribeToPush` is only ever called from that click — which is also what
 * browsers require.
 *
 * When push is not configured on the deployment (no VAPID keys) this renders
 * the honest state rather than a switch that would silently do nothing.
 */
export function PushOptIn() {
    const { t } = useLanguage()
    const [state, setState] = useState<State>("checking")

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    useEffect(() => {
        let cancelled = false

        async function check() {
            const support = detectPushSupport()
            if (!support.supported) {
                if (!cancelled) setState("unsupported")
                return
            }
            if (!publicKey) {
                if (!cancelled) setState("unavailable")
                return
            }
            if (support.permission === "denied") {
                if (!cancelled) setState("denied")
                return
            }

            // Granted permission is not the same as being subscribed: site data
            // can be cleared, and the subscription can be revoked server-side.
            // Ask the registration, not the permission.
            try {
                const registration = await navigator.serviceWorker.getRegistration()
                const subscription = await registration?.pushManager.getSubscription()
                if (!cancelled) setState(subscription ? "on" : "off")
            } catch {
                if (!cancelled) setState("off")
            }
        }

        check()
        return () => {
            cancelled = true
        }
    }, [publicKey])

    async function enable() {
        setState("working")
        const result = await subscribeToPush(publicKey)
        if (result.ok) {
            setState("on")
            return
        }
        if (result.reason === "denied") {
            setState("denied")
            toast.error(t.settings.push.denied)
            return
        }
        // A dismissed prompt is not a failure — the customer simply has not
        // decided, and they can ask again.
        setState("off")
        if (result.reason !== "dismissed") toast.error(t.settings.push.failed)
    }

    async function disable() {
        setState("working")
        await unsubscribeFromPush()
        setState("off")
    }

    if (state === "checking") return null

    if (state === "unsupported" || state === "unavailable" || state === "denied") {
        return (
            <div className="flex items-start justify-between gap-3 p-3 rounded-2xl">
                <div>
                    <p className="text-micro font-bold text-black/80 dark:text-white/70">
                        {t.settings.push.title}
                    </p>
                    <p className="text-caption text-muted-foreground mt-1">
                        {state === "unsupported"
                            ? t.settings.push.unsupported
                            : state === "unavailable"
                              ? t.settings.push.unavailable
                              : t.settings.push.denied}
                    </p>
                </div>
            </div>
        )
    }

    const isOn = state === "on"
    return (
        <div className="flex items-center justify-between gap-3 p-3 hover:bg-black/5 dark:hover:bg-black/80 rounded-2xl transition-all">
            <div>
                <p className="text-micro font-bold text-black/80 dark:text-white/70">
                    {t.settings.push.title}
                </p>
                <p className="text-caption text-muted-foreground mt-1">
                    {isOn ? t.settings.push.enabled : t.settings.push.description}
                </p>
            </div>
            <button
                type="button"
                onClick={isOn ? disable : enable}
                disabled={state === "working"}
                aria-label={isOn ? t.settings.push.disable : t.settings.push.enable}
                className="pw-btn pw-btn-sm shrink-0 disabled:opacity-60"
            >
                {isOn ? t.settings.push.disable : t.settings.push.enable}
            </button>
        </div>
    )
}
