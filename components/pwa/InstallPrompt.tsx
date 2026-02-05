"use client"

import { useEffect, useState } from "react"
import { Download, X, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/useResponsive"
import { AnimatePresence, motion } from "framer-motion"

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const isMobile = useMediaQuery("(max-width: 768px)")

    useEffect(() => {
        // Check for iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice)

        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (isStandalone) return;

        if (isIOSDevice) {
            // Show iOS instructions after a short delay
            const timer = setTimeout(() => setShowPrompt(true), 3000)
            return () => clearTimeout(timer)
        }

        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
        }

        window.addEventListener("beforeinstallprompt", handler)

        return () => window.removeEventListener("beforeinstallprompt", handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setShowPrompt(false)
        }
        setDeferredPrompt(null)
    }

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96"
            >
                <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-semibold text-foreground">Install PolicyWallet</h3>
                            <p className="text-sm text-muted-foreground">
                                Add to home screen for offline access and faster loading.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowPrompt(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {isIOS ? (
                        <div className="mt-3 text-sm flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                1. Tap the <Share className="w-4 h-4" /> Share button
                            </div>
                            <div className="flex items-center gap-2">
                                2. Scroll down and tap "Add to Home Screen"
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleInstall}
                            className="w-full mt-3 gap-2 font-medium"
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
