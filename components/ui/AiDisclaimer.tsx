"use client"

import { Info } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getTranslations, type Language } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface AiDisclaimerProps {
    /** Optional explicit language. When omitted, falls back to the LanguageContext. */
    language?: Language
    /** "block" (default) renders a bordered footnote; "inline" renders plain muted text. */
    variant?: "block" | "inline"
    className?: string
}

/**
 * Informational disclaimer shown wherever AI-generated gap analysis, recommendations,
 * or protection scores reach a user. Renders the canonical `common.aiAdviceDisclaimer`
 * i18n string (EL/EN) — never hardcode the text at call sites.
 */
export function AiDisclaimer({ language, variant = "block", className }: AiDisclaimerProps) {
    const { t } = useLanguage()
    const text = language ? getTranslations(language).common.aiAdviceDisclaimer : t.common.aiAdviceDisclaimer

    return (
        <p
            role="note"
            className={cn(
                "flex items-start gap-1.5 text-xs leading-snug text-slate-500 dark:text-slate-500",
                variant === "block" && "mt-3 border-t border-slate-200 dark:border-slate-700 pt-2",
                className
            )}
        >
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{text}</span>
        </p>
    )
}
