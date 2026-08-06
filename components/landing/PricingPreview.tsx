import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import type { PublicPricingPlan } from "@/lib/pricing/public-pricing-content"
import type { MarketingLocale } from "@/lib/marketing/positioning"

/**
 * Homepage price band.
 *
 * "How much is it?" is one of the three questions every visitor asks, and the
 * homepage used to send them to another page to find out. Prices come in from
 * the SAME live plan catalog that /pricing renders (read-only), so the two
 * surfaces cannot quote different numbers.
 *
 * Server component: static markup, no JS shipped.
 */
export function PricingPreview({
    locale,
    plans,
}: {
    locale: MarketingLocale
    plans: readonly PublicPricingPlan[]
}) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const pick = (value: { el: string; en: string }) => (locale === "el" ? value.el : value.en)

    // Contact-sales tiers have no public price and belong on /pricing, not here.
    const visiblePlans = plans.filter((plan) => !plan.isContactPlan).slice(0, 3)
    if (visiblePlans.length === 0) return null

    return (
        <section
            id="pricing-preview"
            aria-labelledby="pricing-preview-heading"
            className="scroll-mt-28 border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-page">
                <div className="mb-12 text-center">
                    <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                        {t("Τιμές", "Pricing")}
                    </p>
                    <h2
                        id="pricing-preview-heading"
                        className="mb-4 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t("Ξεκινάτε δωρεάν. Πληρώνετε μόνο αν θέλετε παραπάνω.", "Start free. Pay only if you want more.")}
                    </h2>
                    <p className="mx-auto max-w-[560px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Καμία κρυφή χρέωση. Ακυρώνετε όποτε θέλετε.",
                            "No hidden charges. Cancel whenever you want.",
                        )}
                    </p>
                </div>

                <ul className="grid gap-5 md:grid-cols-3">
                    {visiblePlans.map((plan) => {
                        const topFeature = plan.features.find((feature) => feature.included)
                        return (
                            <li
                                key={plan.key}
                                className={`flex flex-col rounded-2xl border bg-white p-7 dark:bg-slate-950 ${
                                    plan.isHighlighted
                                        ? "border-[#29685B] dark:border-[#A7F3D0]/60"
                                        : "border-[#E2E8F0] dark:border-slate-800"
                                }`}
                            >
                                <div className="mb-4 flex items-center gap-2">
                                    <h3 className="text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                        {pick(plan.name)}
                                    </h3>
                                    {plan.badge ? (
                                        <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-kicker font-bold uppercase tracking-wide text-[#166534] dark:bg-[#29685B]/25 dark:text-[#A7F3D0]">
                                            {pick(plan.badge)}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mb-4 flex items-baseline gap-1">
                                    <span className="text-h2 font-bold tracking-tight text-[#0F172A] dark:text-white">
                                        {plan.pricing.monthly.amount}
                                    </span>
                                    <span className="text-body text-[#5B6A7A] dark:text-slate-400">
                                        {pick(plan.pricing.monthly.period)}
                                    </span>
                                </p>

                                <p className="mb-4 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {pick(plan.description)}
                                </p>

                                {topFeature ? (
                                    <p className="mt-auto flex items-start gap-2 text-body-lg font-medium text-[#0F172A] dark:text-white">
                                        <Check
                                            aria-hidden
                                            className="mt-1 h-4 w-4 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]"
                                        />
                                        {pick(topFeature.label)}
                                    </p>
                                ) : null}
                            </li>
                        )
                    })}
                </ul>

                <div className="mt-10 text-center">
                    <Link href={localizeHref("/pricing", locale)} className="pw-secondary-button pw-btn-lg">
                        {t("Δείτε όλα τα πλάνα", "See every plan")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
