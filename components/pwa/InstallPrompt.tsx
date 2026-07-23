"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, X, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"

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
    const pathname = usePathname()
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
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
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        await deferredPrompt.userChoice

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
                className="fixed bottom-24 left-3 right-3 z-40 sm:left-auto sm:right-6 sm:w-80"
            >
                <Card className="p-3.5 shadow-xl border-primary/30 dark:border-mint/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint flex items-center justify-center">
                            <Download className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-stone-900 dark:text-white">Install PolicyWallet</h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Faster access from your home screen.</p>
                        </div>
                        <button
                            onClick={dismissPrompt}
                            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                            aria-label="Dismiss install prompt"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isIOS ? (
                        <div className="mt-3 text-xs flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-lg text-stone-600 dark:text-stone-300">
                            <Share className="w-4 h-4 mt-0.5" />
                            <span>Tap Share and choose Add to Home Screen.</span>
                        </div>
                    ) : (
                        <Button
                            onClick={handleInstall}
                            className="w-full mt-3 gap-2 h-9 text-sm font-semibold"
                        >
                            <Download className="w-4 h-4" />
                            Install App
                        </Button>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    )
}
