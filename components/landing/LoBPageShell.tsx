import React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { SKIP_LINK_TARGET_ID } from "@/lib/nav/public-nav"
import { DEFAULT_PLAN_FACTS } from "@/lib/pricing/plan-defaults"
import { formatEur } from "@/lib/pricing/pricing-view-model"

/**
 * Names and prices come from the same defaults that seed the live catalog,
 * so this band cannot spell a plan name or price the pricing page does not.
 * Residual risk, accepted: an /admin/plans price edit updates /pricing (live
 * catalog) but not this baseline — if prices ever diverge, this is why.
 */
const FUNNEL_PLANS = (() => {
    const starter = DEFAULT_PLAN_FACTS.find((p) => p.id === "ph-plus")
    const plus = DEFAULT_PLAN_FACTS.find((p) => p.id === "ph-pro")
    return starter && plus ? { starter, plus } : null
})()

const AGENT_FUNNEL_PLANS = (() => {
    const starter = DEFAULT_PLAN_FACTS.find((p) => p.id === "agent-starter")
    const pro = DEFAULT_PLAN_FACTS.find((p) => p.id === "agent-pro")
    return starter && pro ? { starter, pro } : null
})()

interface LoBPageShellProps {
    children: React.ReactNode
    /**
     * Locale comes in as a prop rather than from the language CONTEXT, which is
     * what lets this be a Server Component: a server component cannot read React
     * context. PublicHeader/PublicMegaFooter already worked this way.
     */
    locale: "el" | "en"
    /**
     * Retained for call-site compatibility; active-state is now derived from
     * the pathname inside PublicHeader, so this is no longer read.
     */
    activeNav?: "product" | "company" | "pricing" | "none"
    /**
     * Which plans the closing pricing band quotes. The agents page must not
     * end on €2.99/€7.99 — an agent would read the B2C prices as theirs.
     */
    audience?: "policyholder" | "agent"
}

/**
 * Shared shell for public marketing pages: the canonical PublicHeader, a
 * `<main>` landmark (skip-link target), a pricing funnel band, and the shared
 * footer. The header/nav/mobile-menu now live in PublicHeader so every public
 * page renders identical chrome.
 */
export function LoBPageShell({ children, locale, audience = "policyholder" }: LoBPageShellProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const l = (href: string) => localizeHref(href, locale)
    const isAgentAudience = audience === "agent"

    return (
        <div className={`min-h-screen bg-white text-neutral-900 selection:bg-brand-green/20 selection:text-neutral-900 dark:bg-slate-950 dark:text-white`}>
            <PublicHeader locale={locale} />

            <main id={SKIP_LINK_TARGET_ID} tabIndex={-1} className="pt-28 lg:pt-36">
                {children}

                {/* Pricing funnel — every LoB page routes to /pricing from the body, not only the nav */}
                <section className="border-t border-neutral-200 bg-white px-6 py-16 text-center lg:px-12 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mx-auto max-w-[760px]">
                        <h2 className="mb-4 text-h2 font-medium leading-[1.15] tracking-[-0.03em] text-neutral-900 lg:text-h1 dark:text-white">
                            {isAgentAudience
                                ? t("Πλήρης ανάλυση κάθε ασφαλιστηρίου με το Family.", "Full analysis of every policy with Family.")
                                : t("Δωρεάν για 3 ασφαλιστήρια. Αναβάθμιση όποτε τη χρειαστείτε.", "Free for 3 policies. Upgrade whenever you need it.")}
                        </h2>
                        <p className="mb-8 text-body-lg leading-relaxed text-neutral-600 dark:text-slate-400">
                            {isAgentAudience
                                ? AGENT_FUNNEL_PLANS
                                    ? t(
                                          `${AGENT_FUNNEL_PLANS.starter.displayName} ${formatEur(AGENT_FUNNEL_PLANS.starter.monthlyEur)}/μήνα, ${AGENT_FUNNEL_PLANS.pro.displayName} ${formatEur(AGENT_FUNNEL_PLANS.pro.monthlyEur)}/μήνα για ομάδες. Ακύρωση όποτε θέλετε.`,
                                          `${AGENT_FUNNEL_PLANS.starter.displayName} at ${formatEur(AGENT_FUNNEL_PLANS.starter.monthlyEur)}/month, ${AGENT_FUNNEL_PLANS.pro.displayName} at ${formatEur(AGENT_FUNNEL_PLANS.pro.monthlyEur)}/month for teams. Cancel anytime.`
                                      )
                                    : t("Δείτε όλα τα πλάνα στη σελίδα τιμών.", "See every plan on the pricing page.")
                                : FUNNEL_PLANS
                                  ? t(
                                        `${FUNNEL_PLANS.starter.displayName} ${formatEur(FUNNEL_PLANS.starter.monthlyEur)}/μήνα, ${FUNNEL_PLANS.plus.displayName} ${formatEur(FUNNEL_PLANS.plus.monthlyEur)}/μήνα με πλήρη ανάλυση AI. Ακύρωση όποτε θέλετε.`,
                                        `${FUNNEL_PLANS.starter.displayName} at ${formatEur(FUNNEL_PLANS.starter.monthlyEur)}/month, ${FUNNEL_PLANS.plus.displayName} at ${formatEur(FUNNEL_PLANS.plus.monthlyEur)}/month with full AI analysis. Cancel anytime.`
                                    )
                                  : t("Δείτε όλα τα πλάνα στη σελίδα τιμών.", "See every plan on the pricing page.")}
                        </p>
                        <Link
                            href={l(isAgentAudience ? "/pricing?audience=agent" : "/pricing")}
                            className="pw-secondary-button pw-btn-lg"
                        >
                            {t("Δείτε τις τιμές", "See pricing")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>

            <PublicMegaFooter locale={locale} />
        </div>
    )
}
