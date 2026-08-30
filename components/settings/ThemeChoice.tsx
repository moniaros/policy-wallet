"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useLanguage } from "@/contexts/LanguageContext"
import { SegmentedControl } from "@/src/design-system/segmented-control"

type ThemeValue = "system" | "light" | "dark"

/**
 * The three-way theme choice (Αυτόματα / Φωτεινό / Σκούρο). Reads `theme`,
 * not `resolvedTheme`: `theme` is what next-themes stores and is `"system"`
 * until the user picks an explicit side — the state the shell's binary
 * toggle cannot represent and destroys on first click.
 */
export function ThemeChoice() {
    const { theme, setTheme } = useTheme()
    const { t } = useLanguage()
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    if (!mounted) return <div className="h-11" aria-hidden />
    return (
        <SegmentedControl<ThemeValue>
            label={t.app.me.theme}
            value={(theme as ThemeValue) ?? "system"}
            onChange={setTheme}
            options={[
                { value: "system", label: t.app.me.themeOptions.auto },
                { value: "light", label: t.app.me.themeOptions.light },
                { value: "dark", label: t.app.me.themeOptions.dark },
            ]}
        />
    )
}
