"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, X, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

const DISMISS_KEY = "pwa_prompt_dismissed_at"
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

const HIDDEN_PATH_PREFIXES = [
    "/auth",
    "/onboarding",
    "/wallet/add",
]

const HIDDEN_EXACT_PATHS = [
    "/wallet",
    "/coverage-insights",
]

function shouldHidePrompt(pathname: string | null) {
    if (!pathname) return false
    if (HIDDEN_EXACT_PATHS.includes(pathname)) return true
    if (pathname.startsWith("/wallet/") && pathname.split("/").length >= 3) return true
    return HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function InstallPrompt() {
    const { t } = useLanguage()
    const pathname = usePathname()
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [installing, setInstalling] = useState(false)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    const hiddenForRoute = useMemo(() => shouldHidePrompt(pathname), [pathname])

    useEffect(() => {
        if (hiddenForRoute) {
            setShowPrompt(false)
            return
        }

        const dismissedAt = localStorage.getItem(DISMISS_KEY)
        if (dismissedAt && Date.now() - Number(dismissedAt) < SNOOZE_MS) return

        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        setIsIOS(isIOSDevice)

        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone

        if (isStandalone) return

        // Snooze as soon as we decide to show it: the banner still appears this
        // session, but a reload within the window won't re-trigger it — this is
        // what stops the "opens on every reload" nagging.
        const snooze = () => {
            try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
        }

        // Once installed, never prompt again.
        const onInstalled = () => { snooze(); setShowPrompt(false) }
        window.addEventListener("appinstalled", onInstalled)

        if (isIOSDevice) {
            const timer = setTimeout(() => { setShowPrompt(true); snooze() }, 5000)
            return () => {
                clearTimeout(timer)
                window.removeEventListener("appinstalled", onInstalled)
            }
        }

        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
            snooze()
        }

        window.addEventListener("beforeinstallprompt", handler)
        return () => {
            window.removeEventListener("beforeinstallprompt", handler)
            window.removeEventListener("appinstalled", onInstalled)
        }
    }, [hiddenForRoute])

    const dismissPrompt = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
        setShowPrompt(false)
    }

    const handleInstall = async () => {
        if (!deferredPrompt || installing) return
        setInstalling(true)

        try {
            await deferredPrompt.prompt()
            await deferredPrompt.userChoice
        } catch (error) {
            // prompt() rejects if it has already been consumed. Nothing to tell
            // the user — just stop, and let the banner fall through to dismiss.
            console.error('[InstallPrompt] install prompt failed', error)
        } finally {
            setInstalling(false)
        }

        // Persist regardless of outcome so an install attempt (accepted, or the
        // native dialog cancelled) doesn't leave the banner re-appearing.
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
        setShowPrompt(false)
        setDeferredPrompt(null)
    }

    if (!showPrompt || hiddenForRoute) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                // Rides the same variables the bottom nav sizes itself from, plus
                // the safe-area inset. A static bottom-24 (96px) sat 14px INSIDE
                // the nav's footprint on any notched phone: the bar is 76px of
                // content + env(safe-area-inset-bottom) ≈ 110px, and at an equal
                // z-40 this later-in-DOM banner painted over the tab labels.
                className="fixed bottom-[calc(var(--pw-bottom-nav-h,5rem)+env(safe-area-inset-bottom,0px)+0.75rem)] left-3 right-3 z-40 sm:left-auto sm:right-6 sm:w-80"
            >
                <Card className="p-3.5 shadow-xl border-primary/30 dark:border-mint/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint flex items-center justify-center">
                            <Download className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-stone-900 dark:text-white">{t.notifications.pwaInstallTitle}</h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{t.notifications.pwaInstallSubtitle}</p>
                        </div>
                        <button
                            onClick={dismissPrompt}
                            // A bare 16px icon before — the smallest tap target in the
                            // product, on its most transient surface. 44px box, negative
                            // margin so the card keeps its compact padding.
                            className="-m-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={t.common.close}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isIOS ? (
                        <div className="mt-3 text-xs flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-lg text-stone-600 dark:text-stone-300">
                            <Share className="w-4 h-4 mt-0.5" />
                            <span>{t.notifications.pwaInstallIos}</span>
                        </div>
                    ) : (
                        <Button
                            onClick={handleInstall}
                            disabled={installing}
                            className="w-full mt-3 gap-2 h-11 text-sm font-semibold"
                        >
                            <Download className="w-4 h-4" />
                            {t.notifications.pwaInstallCta}
                        </Button>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    )
}
