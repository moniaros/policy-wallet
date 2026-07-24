"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"

/**
 * The one language switcher.
 *
 * There were five implementations across the auth flow and shell, labelling
 * Greek three different ways — "ΕΛ" (signin, signup), "EL" (signup
 * confirmation) and "GR" (AppShell) — and splitting into two incompatible
 * interaction models:
 *
 *   • pick-from-two, where the highlighted code is the language you are IN
 *     (signin, signup, AppShell), and
 *   • toggle-to-other, where the single code shown is the language you would
 *     SWITCH TO (forgot-password, signup confirmation).
 *
 * So a lone "EN" meant "you are reading English" on one screen and "click for
 * English" on the next — opposite meanings, two steps apart in the same flow.
 * Both options are always shown now, with the current one marked pressed.
 *
 * "GR" was also wrong on its own terms: that is the country code for Greece.
 * The language is `el` (ISO 639-1), written "ΕΛ" in Greek.
 */

export const LOCALE_OPTIONS = [
    { value: "el" as const, label: "ΕΛ" },
    { value: "en" as const, label: "EN" },
]

export function LocaleToggle({
    className,
    /** "plain" = text buttons with a divider (auth pages); "group" = segmented pill (shell). */
    variant = "plain",
    ariaLabel,
}: {
    className?: string
    variant?: "plain" | "group"
    ariaLabel: string
}) {
    const { language, setLanguage } = useLanguage()

    if (variant === "group") {
        return (
            <div
                role="group"
                aria-label={ariaLabel}
                className={cn("flex rounded-lg bg-black/5 p-0.5 dark:bg-white/10", className)}
            >
                {LOCALE_OPTIONS.map(({ value, label }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setLanguage(value)}
                        aria-pressed={language === value}
                        className={cn(
                            "rounded-md px-2.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            language === value
                                ? "bg-white text-black shadow-sm dark:bg-black dark:text-mint"
                                : "text-black/60 dark:text-white/60"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
        )
    }

    return (
        <div role="group" aria-label={ariaLabel} className={cn("flex items-center gap-2", className)}>
            {LOCALE_OPTIONS.map(({ value, label }, i) => (
                <span key={value} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className="text-[#E2E8F0] dark:text-white/20">|</span>}
                    <button
                        type="button"
                        onClick={() => setLanguage(value)}
                        aria-pressed={language === value}
                        className={cn(
                            "text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            language === value
                                ? "text-[#0F172A] dark:text-white"
                                : "text-[#5B6A7A] hover:text-[#0F172A] dark:hover:text-white"
                        )}
                    >
                        {label}
                    </button>
                </span>
            ))}
        </div>
    )
}
