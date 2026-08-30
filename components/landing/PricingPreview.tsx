"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import type { PublicPricingPlan } from "@/lib/pricing/public-pricing-content"
import type { MarketingLocale } from "@/lib/marketing/positioning"
import { PlanRecommender } from "@/src/design-system/plan-recommender"

/**
 * Homepage price band.
 *
 * "How much is it?" is one of the three questions every visitor asks, and the
 * homepage used to send them to another page to find out. Prices come in from
 * the SAME live plan catalog that /pricing renders (read-only), so the two
 * surfaces cannot quote different numbers.
 *
 * Client component since the §6 billing toggle — the one interaction the
 * band owns. Everything it renders still comes in as serialisable props from
 * the same live catalog /pricing reads.
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
    // §6: the billing toggle. Monthly is the DEFAULT — the base price, not the
    // discounted anchor — and the annual option carries its own savings label.
    const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
    const priceOf = (plan: PublicPricingPlan) =>
        billing === "annual" && plan.pricing.annual ? plan.pricing.annual : plan.pricing.monthly

    // Contact-sales tiers have no public price and belong on /pricing, not here.
    //
    // The two PAID plans get the billing, side by side and cheapest first, so a
    // visitor reads the ladder in the direction it climbs. The free tier is
    // real and stated — but underneath, as one line with a quiet link, because
    // leading with the floor anchors everything after it as an upsell off zero.
    //
    // Selected by PRICE, not by key: the internal keys are `free` / `plus` /
    // `pro`, where `plus` is the plan displayed as "Starter" and `pro` is the
    // one displayed as "Family". Sorting on those names would be a
    // trap for whoever edits this next.
    const amountOf = (plan: PublicPricingPlan) => {
        const digits = plan.pricing.monthly.amount.replace(/[^\d.,]/g, "").replace(",", ".")
        const value = Number.parseFloat(digits)
        return Number.isFinite(value) ? value : 0
    }
    const bookable = plans.filter((plan) => !plan.isContactPlan)
    const freePlan = bookable.find((plan) => amountOf(plan) === 0)
    const paidPlans = bookable.filter((plan) => amountOf(plan) > 0).sort((a, b) => amountOf(a) - amountOf(b))
    // §6: the Free card is a CARD — same grid, same stature as the paid two.
    // The quiet-row treatment undersold a plan that really exists; a plan the
    // page half-hides reads as a trick, not a floor.
    const visiblePlans = freePlan ? [freePlan, ...paidPlans] : paidPlans
    if (visiblePlans.length === 0) return null

    return (
        <section
            id="pricing-preview"
            aria-labelledby="pricing-preview-heading"
            className="scroll-mt-28 border-y border-neutral-200 bg-neutral-50 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-page">
                <div className="mb-12 text-center">
                    <h2
                        id="pricing-preview-heading"
                        className="mb-4 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-900 lg:text-h1 dark:text-white"
                    >
                        {t(
                            "Μία συνδρομή, όλα τα ασφαλιστήριά σας διαβασμένα.",
                            "One subscription, every policy of yours read.",
                        )}
                    </h2>
                    <p className="mx-auto max-w-[560px] text-lead leading-relaxed text-neutral-600 dark:text-slate-300">
                        {t(
                            "Πλήρης ανάλυση, κενά κάλυψης και υπενθυμίσεις πριν λήξει κάτι. Καμία κρυφή χρέωση, ακυρώνετε όποτε θέλετε.",
                            "Full analysis, coverage gaps and reminders before something runs out. No hidden charges, cancel whenever you want.",
                        )}
                    </p>
                </div>

                {/* §6: the recommender rides with the price — the slider's
                    ceilings come from the enforced entitlement source. */}
                <PlanRecommender locale={locale} plans={plans} className="mb-12" />

                <div className="mb-8 flex justify-center">
                    <div
                        role="group"
                        aria-label={t("Συχνότητα χρέωσης", "Billing frequency")}
                        className="inline-flex rounded-full border border-neutral-200 p-1 dark:border-slate-700"
                    >
                        <button
                            type="button"
                            aria-pressed={billing === "monthly"}
                            onClick={() => setBilling("monthly")}
                            className={`min-h-11 rounded-full px-5 text-body-sm font-semibold transition-colors ${
                                billing === "monthly"
                                    ? "bg-primary text-white dark:bg-mint dark:text-slate-900"
                                    : "text-neutral-600 dark:text-slate-300"
                            }`}
                        >
                            {t("Μηνιαία", "Monthly")}
                        </button>
                        <button
                            type="button"
                            aria-pressed={billing === "annual"}
                            onClick={() => setBilling("annual")}
                            className={`min-h-11 rounded-full px-5 text-body-sm font-semibold transition-colors ${
                                billing === "annual"
                                    ? "bg-primary text-white dark:bg-mint dark:text-slate-900"
                                    : "text-neutral-600 dark:text-slate-300"
                            }`}
                        >
                            {t("Ετήσια", "Annual")}
                        </button>
                    </div>
                </div>

                <ul className="grid gap-5 md:grid-cols-3">
                    {visiblePlans.map((plan) => {
                        const topFeature = plan.features.find((feature) => feature.included)
                        return (
                            <li
                                key={plan.key}
                                className={`flex flex-col rounded-2xl border bg-white p-7 dark:bg-slate-950 ${
                                    plan.isHighlighted
                                        ? "border-primary dark:border-[#A7F3D0]/60"
                                        : "border-neutral-200 dark:border-slate-800"
                                }`}
                            >
                                {/* Wraps: at 768 the English "RECOMMENDED" badge
                                    sat beside a long plan name and pushed the
                                    document 2px wider than the viewport. */}
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <h3 className="text-title font-semibold tracking-tight text-neutral-900 dark:text-white">
                                        {pick(plan.name)}
                                    </h3>
                                    {plan.badge ? (
                                        <span className="rounded-full bg-status-success-tint px-2.5 py-0.5 text-kicker font-bold uppercase tracking-wide text-status-success">
                                            {pick(plan.badge)}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mb-1 flex items-baseline gap-1">
                                    <span className="text-h2 font-bold tracking-tight text-neutral-900 dark:text-white">
                                        {priceOf(plan).amount}
                                    </span>
                                    <span className="text-body text-muted-foreground dark:text-slate-400">
                                        {pick(priceOf(plan).period)}
                                    </span>
                                </p>
                                <p className="mb-4 min-h-5 text-body-sm text-neutral-500 dark:text-slate-400">
                                    {billing === "annual" && plan.pricing.annual
                                        ? pick(plan.pricing.annual.savings)
                                        : "\u00a0"}
                                </p>

                                <p className="mb-4 text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                                    {pick(plan.description)}
                                </p>

                                {topFeature ? (
                                    <p className="mt-auto flex items-start gap-2 text-body-lg font-medium text-neutral-900 dark:text-white">
                                        <Check
                                            aria-hidden
                                            className="mt-1 h-4 w-4 flex-shrink-0 text-primary dark:text-[#A7F3D0]"
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
