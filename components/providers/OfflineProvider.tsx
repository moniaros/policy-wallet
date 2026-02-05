"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { toast } from "sonner"
import { Wifi, WifiOff } from "lucide-react"

interface OfflineContextType {
    isOnline: boolean
}

const OfflineContext = createContext<OfflineContextType>({
    isOnline: true,
})

export const useOffline = () => useContext(OfflineContext)

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        // Initial check
        if (typeof window !== "undefined") {
            setIsOnline(navigator.onLine)
        }

        const handleOnline = () => {
            setIsOnline(true)
            toast.success("You are back online", {
                icon: <Wifi className="w-4 h-4" />,
            })
        }

        const handleOffline = () => {
            setIsOnline(false)
            toast.warning("You are offline. Showing cached data.", {
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
    }, [])

    return (
        <OfflineContext.Provider value={{ isOnline }}>
            {children}
        </OfflineContext.Provider>
    )
}
