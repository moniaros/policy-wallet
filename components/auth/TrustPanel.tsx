"use client"

import Link from "next/link"
import { localizeHref } from "@/lib/seo/locale-links"
import { useLanguage } from "@/contexts/LanguageContext"
import { TRUST_FACTS, pick } from "@/lib/marketing/positioning"
import { presentationCopy } from "@/lib/i18n/presentation"

/** Product explanation beside authentication; no invented policy or assurance states. */
export function TrustPanel({ variant }: { variant: "policyholder" | "agent" }) {
    const { language } = useLanguage()
    const locale = language === "en" ? "en" : "el"
    const copy = presentationCopy[locale]
    return (
        <div className="w-full max-w-[520px] text-white">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
                {variant === "agent" ? copy.professionalTitle : copy.individualTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/90">
                {variant === "agent" ? copy.professionalBody : copy.individualBody}
            </p>
            <Link href={localizeHref("/trust", locale)} className="mt-6 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                {copy.trustLink}
            </Link>
        </div>
    )
}

/**
 * The mobile text path for the trust facts (brief §3): the panel is omitted
 * from the tree below 1024, but the facts are informational — so they render
 * UNDER the form on phones, as text. `lg:hidden` because ≥1024 the panel
 * carries them.
 */
export function MobileTrustFacts() {
    const { language } = useLanguage()
    const locale: "el" | "en" = language === "en" ? "en" : "el"
    return (
        <ul className="mt-g-8 flex flex-col gap-g-3 border-t border-border-subtle pt-g-6 lg:hidden">
            {TRUST_FACTS.map((fact) => (
                <li key={fact.label.el} className="text-g-caption text-fg-secondary">
                    <span className="font-semibold text-fg-primary">{pick(fact.label, locale)}.</span>{" "}
                    {pick(fact.detail, locale)}
                </li>
            ))}
        </ul>
    )
}
