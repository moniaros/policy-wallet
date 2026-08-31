"use client"

import { PolicyStrip, BrokerScanPanel } from "@/src/design-system"
import { useLanguage } from "@/contexts/LanguageContext"
import { TRUST_FACTS, pick } from "@/lib/marketing/positioning"

/**
 * The right column of the split auth shell (brief §2.5): shows what the
 * product DOES — never an outcome promise, never a user count, never a form
 * field. Samples are stamped as samples; statuses speak the three-state
 * vocabulary. On-brand fill behind it comes from AuthShell; text here uses
 * `fg-on-brand`, cards flip back to raised surfaces.
 */
export function TrustPanel({ variant }: { variant: "policyholder" | "agent" }) {
    const { language } = useLanguage()
    const locale: "el" | "en" = language === "en" ? "en" : "el"
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    if (variant === "agent") {
        return (
            <div className="w-full max-w-[460px] text-fg-on-brand">
                <p className="text-g-body-lg font-semibold">
                    {t(
                        "Το χαρτοφυλάκιο ανήκει στον ασφαλισμένο. Βλέπετε μόνο ό,τι σας κοινοποιεί, και μπορεί να το ανακαλέσει.",
                        "The wallet belongs to the policyholder. You see only what they share with you — and they can revoke it.",
                    )}
                </p>
                <div className="mt-g-6">
                    <BrokerScanPanel locale={locale} />
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-[460px] text-fg-on-brand">
            <p className="text-g-body-lg font-semibold">
                {t("Δεν αξιολογούμε ασφαλιστήρια. Αξιολογούμε την προστασία σας.", "We do not grade policies. We map your protection.")}
            </p>
            <div className="mt-g-6 rounded-g-lg bg-surface-raised p-g-5 text-fg-primary">
                <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-secondary">
                    {t("Δείγμα — όχι πραγματικό ασφαλιστήριο", "Sample — not a real policy")}
                </p>
                <PolicyStrip
                    className="mt-g-3"
                    items={[
                        { name: t("Αυτοκίνητο", "Car"), state: "covered" },
                        { name: t("Κατοικία", "Home"), state: "gap" },
                        { name: t("Υγεία", "Health"), state: "review" },
                    ]}
                />
            </div>
            <ul className="mt-g-6 flex flex-col gap-g-4">
                {TRUST_FACTS.map((fact) => (
                    <li key={fact.label.el}>
                        <p className="font-semibold">{pick(fact.label, locale)}</p>
                        <p className="mt-g-1 text-g-body-sm opacity-90">{pick(fact.detail, locale)}</p>
                    </li>
                ))}
            </ul>
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
