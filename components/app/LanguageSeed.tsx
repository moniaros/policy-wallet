"use client"

import { useContext, useEffect } from "react"
import { LanguageStateContext } from "@/contexts/LanguageContext"

/**
 * Seeds the client language from the server-known preference (G6, §6 string
 * architecture): the protected layout renders with `User.preferredLanguage`;
 * this hands the same value to the client provider on mount, so server and
 * client strings agree on first paint on every device. Renders nothing.
 */
export function LanguageSeed({ language }: { language: "el" | "en" }) {
    const state = useContext(LanguageStateContext)
    useEffect(() => {
        if (!state || state.language === language) return
        state.adoptLanguage?.(language)
    }, [state, language])
    return null
}
