"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { toast } from "sonner"
import { Wifi, WifiOff } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface OfflineContextType {
    isOnline: boolean
}

const OfflineContext = createContext<OfflineContextType>({
    isOnline: true,
})

export const useOffline = () => useContext(OfflineContext)

// These toasts were hardcoded English — a Greek user losing connectivity read
// "You are offline. Showing cached data." in English. OfflineProvider mounts in
// the ROOT layout, so it runs on public/marketing routes too, where the `t`
// dictionary (TranslationsProvider) is NOT mounted — only `language` from the
// root LanguageProvider is safe here. So the copy lives inline, keyed by
// language (see docs/design/I18N_CONSUMER_MAP.md).
const OFFLINE_COPY = {
    backOnline: { el: "Επανασυνδεθήκατε στο διαδίκτυο", en: "You are back online" },
    offlineCached: {
        el: "Είστε εκτός σύνδεσης. Εμφανίζονται αποθηκευμένα δεδομένα.",
        en: "You are offline. Showing saved data.",
    },
} as const

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true)
    const { language } = useLanguage()
    const lang: "el" | "en" = language === "el" ? "el" : "en"

    // `lang` is a dependency: the handlers close over the current language, so a
    // mid-session language switch re-subscribes with the correctly-localised toasts.
    useEffect(() => {
        // Initial check
        if (typeof window !== "undefined") {
            setIsOnline(navigator.onLine)
        }

        const handleOnline = () => {
            setIsOnline(true)
            toast.success(OFFLINE_COPY.backOnline[lang], {
                icon: <Wifi className="w-4 h-4" />,
            })
        }

        const handleOffline = () => {
            setIsOnline(false)
            toast.warning(OFFLINE_COPY.offlineCached[lang], {
                icon: <WifiOff className="w-4 h-4" />,
                duration: Infinity, // Keep persistent while offline
                id: "offline-toast"
            })
        }

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [lang])

    return (
        <OfflineContext.Provider value={{ isOnline }}>
            {children}
        </OfflineContext.Provider>
    )
}
