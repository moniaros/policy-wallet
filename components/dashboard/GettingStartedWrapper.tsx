"use client"

import { GettingStartedChecklist } from "./GettingStartedChecklist"
import { useLanguage } from "@/contexts/LanguageContext"

interface GettingStartedWrapperProps {
    policyCount: number
    hasAnalysis: boolean
    gapCount: number
    hasAgent: boolean
    notificationsEnabled: boolean
}

/**
 * Client wrapper that provides LanguageContext to the GettingStartedChecklist.
 * Used in the server-rendered home page.
 */
export function GettingStartedWrapper(props: GettingStartedWrapperProps) {
    const { language } = useLanguage()
    const lang = language === "el" ? "el" : "en"

    return (
        <GettingStartedChecklist
            language={lang as "el" | "en"}
            {...props}
        />
    )
}
