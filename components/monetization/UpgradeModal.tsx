"use client"

/**
 * Context-aware upgrade modal — the standard paid-conversion surface.
 * Opens IN PLACE at the trigger (no navigation), shows the benefit that
 * prompted it, current vs recommended plan, monthly/annual toggle, and
 * hands off to Stripe Checkout with a same-origin return path so the user
 * lands back on the exact feature after paying (/upgrade/success).
 */

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Check, Crown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import {
    FEATURE_GATES,
    PLAN_PRICING,
    getUpgradeCopy,
    recommendedPlan,
    type FeatureKey,
} from "@/lib/monetization"
import type { PlanTier } from "@/types/subscription-entitlements"
import { BillingTrustBox } from "./BillingTrustBox"
import { PlanBadge } from "./PlanBadge"

const MODAL_COPY = {
    payCta: { el: "Συνέχεια στην πληρωμή", en: "Continue to payment" },
    monthly: { el: "Μηνιαία", en: "Monthly" },
    annual: { el: "Ετήσια", en: "Annual" },
    perMonth: { el: "/μήνα", en: "/month" },
    perYear: { el: "/έτος", en: "/year" },
    savings: { el: "2 μήνες δωρεάν", en: "2 months free" },
    trial: { el: "14 ημέρες δωρεάν δοκιμή", en: "14-day free trial" },
    currentPlan: { el: "Τρέχον πλάνο", en: "Current plan" },
    recommended: { el: "Προτεινόμενο", en: "Recommended" },
    checkoutError: { el: "Η μετάβαση στην πληρωμή απέτυχε. Δοκιμάστε ξανά.", en: "Could not start checkout. Please try again." },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

export interface UpgradeModalProps {
    isOpen: boolean
    onClose: () => void
    featureKey: FeatureKey
    /** Where "success" should return the user; defaults to the current path. */
    returnTo?: string
    /** Analytics source, e.g. "policy_qa" or "wallet_add". */
    triggerSource: string
}

export function UpgradeModal({ isOpen, onClose, featureKey, returnTo, triggerSource }: UpgradeModalProps) {
    const { language } = useLanguage()
    const pathname = usePathname()
    const gate = FEATURE_GATES[featureKey]
    const copy = getUpgradeCopy(featureKey, language)

    const [tier, setTier] = useState<PlanTier>("free")
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
    const [isRedirecting, setIsRedirecting] = useState(false)

    const targetPlan = recommendedPlan(tier, gate)
    const pricing = PLAN_PRICING[targetPlan]
    const effectiveReturn = returnTo || pathname || "/wallet"

    useEffect(() => {
        if (!isOpen) return
        trackJourneyEvent("upgrade_modal_opened", {
            plan: tier,
            trigger_source: triggerSource,
            screen: pathname || undefined,
            feature_requested: featureKey,
            locale: language,
        })
        fetch("/api/v1/tokens/usage")
            .then((res) => (res.ok ? res.json() : null))
            .then((payload) => {
                const resolved = payload?.data?.tier || payload?.tier
                if (resolved === "free" || resolved === "plus" || resolved === "pro") setTier(resolved)
            })
            .catch(() => { /* keep free default */ })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const selectPeriod = (period: "monthly" | "annual") => {
        setBillingPeriod(period)
        trackJourneyEvent("billing_period_selected", {
            billing_period: period,
            feature_requested: featureKey,
            trigger_source: triggerSource,
        })
    }

    const handleCheckout = async () => {
        setIsRedirecting(true)
        trackJourneyEvent("checkout_started", {
            plan: targetPlan,
            billing_period: billingPeriod,
            trigger_source: triggerSource,
            feature_requested: featureKey,
            locale: language,
        })
        try {
            const res = await fetch("/api/v1/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: pricing.planId,
                    billingPeriod,
                    returnTo: effectiveReturn,
                }),
            })
            const payload = await res.json()
            const url = payload?.data?.checkout_url || payload?.checkout_url
            if (!res.ok || !url) throw new Error("NO_CHECKOUT_URL")
            window.location.href = url
        } catch {
            setIsRedirecting(false)
            toast.error(pick(MODAL_COPY.checkoutError, language))
        }
    }

    const handleDismiss = () => {
        trackJourneyEvent("paywall_dismissed", {
            feature_requested: featureKey,
            trigger_source: triggerSource,
        })
        onClose()
    }

    const price = billingPeriod === "annual" ? pricing.annualEur : pricing.monthlyEur
    const priceSuffix = billingPeriod === "annual" ? pick(MODAL_COPY.perYear, language) : pick(MODAL_COPY.perMonth, language)

    return (
        <Modal isOpen={isOpen} onClose={handleDismiss}>
            <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                        <Crown className="h-6 w-6 text-primary dark:text-mint" />
                    </div>
                    <h2 className="mt-4 text-xl font-black text-black dark:text-white">{copy.headline}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/65">{copy.body}</p>
                </div>

                {/* Current vs recommended */}
                <div className="mt-5 flex items-center justify-center gap-3 text-xs text-black/50 dark:text-white/55">
                    <span className="inline-flex items-center gap-1.5">
                        {pick(MODAL_COPY.currentPlan, language)}: <PlanBadge tier={tier} />
                    </span>
                    <span aria-hidden>→</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-black/75 dark:text-white/80">
                        {pick(MODAL_COPY.recommended, language)}: <PlanBadge tier={targetPlan} />
                    </span>
                </div>

                {/* Benefits */}
                <ul className="mt-5 space-y-2">
                    {copy.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-black/75 dark:text-white/80">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                            {benefit}
                        </li>
                    ))}
                </ul>

                {/* Billing period toggle */}
                <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1 dark:bg-white/10" role="radiogroup">
                    {(["monthly", "annual"] as const).map((period) => (
                        <button
                            key={period}
                            type="button"
                            role="radio"
                            aria-checked={billingPeriod === period}
                            onClick={() => selectPeriod(period)}
                            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                                billingPeriod === period
                                    ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                                    : "text-black/50 dark:text-white/55"
                            }`}
                        >
                            {period === "monthly" ? pick(MODAL_COPY.monthly, language) : pick(MODAL_COPY.annual, language)}
                            {period === "annual" && (
                                <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#166534] dark:bg-primary/20 dark:text-mint">
                                    {pick(MODAL_COPY.savings, language)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Price + trial */}
                <div className="mt-4 text-center">
                    <span className="text-3xl font-black text-black dark:text-white">€{price}</span>
                    <span className="text-sm text-black/50 dark:text-white/55">{priceSuffix}</span>
                    {pricing.trialDays && (
                        <p className="mt-1 text-xs font-semibold text-primary dark:text-mint">
                            {pick(MODAL_COPY.trial, language)}
                        </p>
                    )}
                </div>

                {/* CTA */}
                <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isRedirecting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold uppercase tracking-widest text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-60 dark:text-[#1A2420]"
                >
                    {isRedirecting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {pick(MODAL_COPY.payCta, language)}
                </button>

                <button
                    type="button"
                    onClick={handleDismiss}
                    className="mt-3 w-full text-center text-xs text-black/45 underline transition-colors hover:text-black/70 dark:text-white/50 dark:hover:text-white/75"
                >
                    {copy.secondaryCta}
                </button>

                <div className="mt-4">
                    <BillingTrustBox text={copy.trust} />
                </div>
            </div>
        </Modal>
    )
}
