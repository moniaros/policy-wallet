"use client"

import React from "react"
import { useTheme } from "next-themes"

/**
 * The label comes from the CALLER, like LocaleToggle's `ariaLabel`: this
 * control renders on both sides of the TranslationsProvider boundary (app
 * shell AND public header), so it cannot read `useLanguage().t` itself —
 * public routes deliberately do not mount the dictionary. The shell passes
 * `t.userMenu.toggleTheme`; public callers pass their own localized string.
 * (It previously built the label from an inline el/en literal pair, which no
 * freeze or lint covered.)
 */
export function ThemeToggle({ ariaLabel }: { ariaLabel: string }) {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="h-11 w-11" /> // placeholder, same box as the button
    }

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            // 36x36 before: p-2 around a 20px icon, under the 44px touch floor.
            className="grid h-11 w-11 place-items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={ariaLabel}
        >
            {resolvedTheme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    )
}
