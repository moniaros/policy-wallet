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
    { value: "el" as const, label: "ΕΛ", name: "Ελληνικά" },
    { value: "en" as const, label: "EN", name: "English" },
]

export function LocaleToggle({
    className,
    /**
     * "plain" = text buttons with a divider (auth pages); "group" = segmented
     * pill (shell); "settings" = full language names, for the settings screen
     * where this is a preference being set rather than a control being used.
     */
    variant = "plain",
    ariaLabel,
}: {
    className?: string
    variant?: "plain" | "group" | "settings"
    ariaLabel: string
}) {
    const { language, setLanguage } = useLanguage()

    if (variant === "settings") {
        return (
            <div
                role="group"
                aria-label={ariaLabel}
                className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}
            >
                {LOCALE_OPTIONS.map(({ value, name }) => {
                    const selected = language === value
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setLanguage(value)}
                            aria-pressed={selected}
                            className={cn(
                                "flex min-h-11 items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                selected
                                    ? "border-primary bg-primary-soft/60 font-semibold text-black dark:border-mint dark:bg-primary/15 dark:text-white"
                                    : "border-black/10 font-medium text-black/80 hover:border-primary/40 dark:border-white/15 dark:text-white/80"
                            )}
                        >
                            {/* A radio-style mark, so the chosen language is not
                                signalled by colour alone. */}
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2",
                                    selected ? "border-primary dark:border-mint" : "border-black/30 dark:border-white/35"
                                )}
                            >
                                {selected && <span className="h-2 w-2 rounded-full bg-primary dark:bg-mint" />}
                            </span>
                            {name}
                        </button>
                    )
                })}
            </div>
        )
    }

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
                            // min-h-11 min-w-11: a two-letter label cannot supply a 44px
                            // target on its own. The "plain" variant got this floor first;
                            // this one — the variant the app shell actually renders —
                            // measured 30x40 until it caught up.
                            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                            // Matches the public header exactly (PublicHeader.tsx): 44px target,
                            // 13px label. It was a 24x24 box at the browser default size —
                            // half the 44px the rest of the site enforces, and visibly larger
                            // than the switcher the visitor just used one route earlier.
                            "inline-flex min-h-11 min-w-[24px] items-center justify-center px-1 text-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            language === value
                                ? "text-[#0F172A] dark:text-white"
                                : "text-[#5B6A7A] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                        )}
                    >
                        {label}
                    </button>
                </span>
            ))}
        </div>
    )
}
