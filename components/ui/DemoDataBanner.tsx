"use client"

import { AlertTriangle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getTranslations, type Language } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Provider name recorded on a run/pipeline; only "mock" fabricates data. */
export function isMockProvider(provider?: string | null): boolean {
    return provider?.toLowerCase() === "mock"
}

interface DemoDataBannerProps {
    /** Provider recorded on the analysis run/pipeline. Banner renders only for "mock". */
    provider?: string | null
    /** Optional explicit language. When omitted, falls back to the LanguageContext. */
    language?: Language
    className?: string
}

/**
 * Loud, unmissable warning that the analysis on screen was fabricated by the
 * mock AI provider rather than read from the user's document.
 *
 * The mock returns `insurerName: "Mock Insurance Co."` and «Εικονική εξήγηση»
 * for ANY upload, in styling identical to a real analysis — so without this
 * banner a demo (or a misconfigured deploy) shows a user confident, specific,
 * entirely invented facts about their own insurance. Deliberately styled as an
 * alert rather than a footnote: the AI disclaimer is a caveat, this is a
 * correction. `role="alert"` so it is announced, not just seen.
 */
export function DemoDataBanner({ provider, language, className }: DemoDataBannerProps) {
    const { t } = useLanguage()
    if (!isMockProvider(provider)) return null

    const copy = language ? getTranslations(language).common : t.common

    return (
        <div
            role="alert"
            className={cn(
                "flex items-start gap-2.5 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-amber-950",
                "dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100",
                className
            )}
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <p className="text-sm font-semibold">{copy.demoDataTitle}</p>
                <p className="mt-0.5 text-sm leading-snug">{copy.demoDataBody}</p>
            </div>
        </div>
    )
}
