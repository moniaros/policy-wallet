"use client"

import { useState } from "react"
import Link from "next/link"
import { B2C_TIER_KEYS, DEFAULT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"
import type { PublicPricingPlan } from "@/lib/pricing/public-pricing-content"
import type { MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"
import { cn } from "@/lib/utils"

/**
 * PlanRecommender (§4.7) — the policy-count slider that highlights the plan
 * whose CEILING actually fits. The ceilings come from
 * `DEFAULT_ENTITLEMENT_LIMITS[tier].policies` — the enforced entitlement
 * source, not copy — so the recommendation cannot drift from what the plan
 * will really hold. Above the largest ceiling it recommends talking to us
 * rather than pretending a fit (absence of a fitting plan must not render
 * as a fit).
 *
 * The verdict is `aria-live=polite` so slider changes are announced; the
 * slider itself is a native range input — keyboard and touch for free.
 */
export function PlanRecommender({
    locale,
    plans,
    className,
}: {
    locale: MarketingLocale
    plans: readonly PublicPricingPlan[]
    className?: string
}) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const [count, setCount] = useState(4)

    const tiers = B2C_TIER_KEYS.map((tier) => ({
        tier,
        ceiling: DEFAULT_ENTITLEMENT_LIMITS[tier].policies,
        plan: plans.find((p) => p.key === tier),
    })).filter((x): x is typeof x & { ceiling: number } => typeof x.ceiling === "number")

    const max = tiers.length ? Math.max(...tiers.map((x) => x.ceiling)) : 0
    const match = tiers.find((x) => count <= x.ceiling)

    const planName = (p: PublicPricingPlan | undefined, tier: string) =>
        p ? (locale === "el" ? p.name.el : p.name.en) : tier

    return (
        <div className={cn("mx-auto max-w-[640px] rounded-g-lg border border-border-subtle bg-surface-raised p-g-6", className)}>
            <label htmlFor="plan-reco-count" className="block text-g-body-sm font-semibold text-fg-primary">
                {t(
                    "Πόσα ασφαλιστήρια έχει το νοικοκυριό σας;",
                    "How many policies does your household hold?",
                )}
            </label>
            <div className="mt-g-4 flex items-center gap-g-4">
                <input
                    id="plan-reco-count"
                    type="range"
                    min={1}
                    max={max + 5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="h-11 w-full accent-[var(--action-primary-bg)]"
                />
                <output
                    htmlFor="plan-reco-count"
                    className="w-10 text-end text-g-display-sm font-bold text-fg-primary"
                    style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                >
                    {count}
                </output>
            </div>

            <div className="mt-g-4 flex flex-wrap gap-g-2" aria-hidden>
                {tiers.map(({ tier, ceiling, plan }) => (
                    <span
                        key={tier}
                        className={cn(
                            "inline-flex min-h-8 items-center rounded-g-pill border px-g-4 text-g-caption font-semibold transition-colors",
                            match?.tier === tier
                                ? "border-transparent bg-action-primary-bg text-fg-on-brand"
                                : "border-border-subtle text-fg-secondary"
                        )}
                    >
                        {planName(plan, tier)} · {ceiling}
                    </span>
                ))}
            </div>

            <p aria-live="polite" className="mt-g-4 text-g-body-sm text-fg-secondary">
                {match ? (
                    <>
                        {t("Σας ταιριάζει το ", "Your fit is ")}
                        <strong className="text-fg-primary">{planName(match.plan, match.tier)}</strong>
                        {t(
                            ` — χωράει έως ${match.ceiling} ασφαλιστήρια.`,
                            ` — it holds up to ${match.ceiling} policies.`,
                        )}
                    </>
                ) : (
                    <>
                        {t(
                            `Πάνω από ${max} ασφαλιστήρια: `,
                            `More than ${max} policies: `,
                        )}
                        <Link href={localizeHref("/pricing", locale)} className="font-semibold text-fg-brand underline underline-offset-4">
                            {t("μιλήστε μαζί μας για το σωστό πλάνο.", "talk to us about the right plan.")}
                        </Link>
                    </>
                )}
            </p>
        </div>
    )
}
