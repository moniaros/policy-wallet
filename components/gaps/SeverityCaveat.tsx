"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { getTranslations } from "@/lib/i18n"
import { SEVERITY_UNDERWRITER_VALIDATED } from "@/lib/gaps/severity-display"
import { cn } from "@/lib/utils"

/**
 * The sentence that says what a severity is worth.
 *
 * PolicyWallet decides severity from a rule, and the rule's thresholds and labels
 * have **not** been validated by an underwriter (Gate 3b — see
 * lib/gaps/severity-display.ts). Until they are, a screen that says "critical"
 * without this line is asserting a risk verdict the product cannot back.
 *
 * Eleven surfaces render severity. Three carried the caveat; seven did not, and
 * the loudest of those announces "N clients with critical gaps" to an ADVISOR, who
 * may repeat it to a customer as though it were an assessment.
 *
 * One component rather than seven copies, so sign-off is a one-line change:
 * flip SEVERITY_UNDERWRITER_VALIDATED and every instance stops rendering. That is
 * the whole reason this is not seven pasted <p> tags.
 */
export function SeverityCaveat({
    lang,
    className,
}: {
    /** Override for callers that already hold a language (server-rendered parents). */
    lang?: "el" | "en"
    className?: string
}) {
    // A validated scale needs no disclaimer. Rendering nothing is the point.
    if (SEVERITY_UNDERWRITER_VALIDATED) return null

    // Two variants, not one component with a conditional hook. Callers that already
    // hold a language (components taking `language` as a prop, which may render
    // outside a LanguageProvider) must not be forced through useLanguage() — it
    // throws when there is no provider, which would turn a disclaimer into a crash.
    return lang ? (
        <CaveatText language={lang} className={className} />
    ) : (
        <CaveatFromContext className={className} />
    )
}

function CaveatFromContext({ className }: { className?: string }) {
    const { language } = useLanguage()
    return <CaveatText language={language === "el" ? "el" : "en"} className={className} />
}

function CaveatText({ language, className }: { language: "el" | "en"; className?: string }) {
    return (
        <p
            className={cn(
                "mt-2 text-body-sm leading-relaxed text-[#64748B] dark:text-slate-400",
                className
            )}
        >
            {getTranslations(language).dashboard.home.recPriorityNote}
        </p>
    )
}
