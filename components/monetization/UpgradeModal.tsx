"use client"

/**
 * Context-aware upgrade modal — the standard paid-conversion surface.
 * Opens IN PLACE at the trigger (no navigation), shows the benefit that
 * prompted it, and offers a DUAL choice: Plus (€7.99, recommended — unlocks
 * the AI feature) as the primary CTA, Starter (€2.99, basic organization) as
 * the cheaper secondary entry. Hands off to Stripe Checkout with a same-origin
 * return path so the user lands back on the exact feature after paying
 * (/upgrade/success). Plus is always the recommended tier; Starter is visible
 * but never positioned as best value.
 */

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Check, Crown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import {
    getUpgradeCopy,
    type FeatureKey,
} from "@/lib/monetization"
import type { PlanTier } from "@/types/subscription-entitlements"
import { formatEur } from "@/lib/pricing/pricing-view-model"
import { BillingTrustBox } from "./BillingTrustBox"
import { PlanBadge } from "./PlanBadge"
import { usePlanFacts } from "./PlanFactsProvider"

const MODAL_COPY = {
    monthly: { el: "Μηνιαία", en: "Monthly" },
    annual: { el: "Ετήσια", en: "Annual" },
    perMonth: { el: "/μήνα", en: "/month" },
    perYear: { el: "/έτος", en: "/year" },
    savings: { el: "2 μήνες δωρεάν", en: "2 months free" },
    trial: { el: "14 ημέρες δωρεάν δοκιμή", en: "14-day free trial" },
    currentPlan: { el: "Τρέχον πλάνο", en: "Current plan" },
    recommendedTag: { el: "Προτείνεται · Πιο δημοφιλές · Καλύτερη αξία", en: "Recommended · Most popular · Best value" },
    plusPrefix: { el: "Συνέχεια με Plus —", en: "Continue with Plus —" },
    starterPrefix: { el: "Ξεκινήστε με Starter —", en: "Start with Starter —" },
    notNow: { el: "Όχι τώρα", en: "Not now" },
    checkoutError: { el: "Η μετάβαση στην πληρωμή απέτυχε. Δοκιμάστε ξανά.", en: "Could not start checkout. Please try again." },
    close: { el: "Κλείσιμο", en: "Close" },
    redirecting: { el: "Μετάβαση στην ασφαλή πληρωμή…", en: "Redirecting to secure payment…" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

// Plus (code key "pro") is the recommended AI tier; Starter (code key "plus")
// is the cheaper organizer entry.
// PLUS/STARTER are resolved inside the component via usePlanFacts() — live
// admin-managed prices with the PLAN_PRICING snapshot as fallback.

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
    // Live admin-managed prices (PlanFactsProvider), PLAN_PRICING as fallback.
    const { tierPricing } = usePlanFacts()
    const PLUS = tierPricing("pro")
    const STARTER = tierPricing("plus")
    const pathname = usePathname()
    const copy = getUpgradeCopy(featureKey, language)

    const [tier, setTier] = useState<PlanTier>("free")
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
    const [redirectingPlan, setRedirectingPlan] = useState<string | null>(null)

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
        trackJourneyEvent("plus_recommended_seen", {
            trigger_source: triggerSource,
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
    }, [isOpen])

    const selectPeriod = (period: "monthly" | "annual") => {
        setBillingPeriod(period)
        trackJourneyEvent("billing_period_selected", {
            billing_period: period,
            feature_requested: featureKey,
            trigger_source: triggerSource,
        })
    }

    const startCheckout = async (
        planId: string,
        planKey: "plus" | "pro",
        selectEvent: "plus_selected" | "starter_selected",
    ) => {
        setRedirectingPlan(planId)
        trackJourneyEvent(selectEvent, {
            plan: planKey,
            billing_period: billingPeriod,
            trigger_source: triggerSource,
            feature_requested: featureKey,
            locale: language,
        })
        trackJourneyEvent("plan_selected", {
            plan: planKey,
            billing_period: billingPeriod,
            trigger_source: triggerSource,
            feature_requested: featureKey,
        })
        trackJourneyEvent("checkout_started", {
            plan: planKey,
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
                    planId,
                    billingPeriod,
                    returnTo: effectiveReturn,
                    triggerSource,
                    feature: featureKey,
                }),
            })
            const payload = await res.json()
            const url = payload?.data?.checkout_url || payload?.checkout_url
            if (!res.ok || !url) throw new Error("NO_CHECKOUT_URL")
            window.location.href = url
        } catch {
            setRedirectingPlan(null)
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

    const suffix = billingPeriod === "annual" ? pick(MODAL_COPY.perYear, language) : pick(MODAL_COPY.perMonth, language)
    const plusPrice = billingPeriod === "annual" ? PLUS.annualEur : PLUS.monthlyEur
    const starterPrice = billingPeriod === "annual" ? STARTER.annualEur : STARTER.monthlyEur
    const isRedirecting = redirectingPlan !== null

    return (
        <Modal isOpen={isOpen} onClose={handleDismiss} ariaLabelledBy="upgrade-modal-title" closeLabel={pick(MODAL_COPY.close, language)}>
            <div className="p-6 sm:p-8">
                {/* Screen-reader announcement while the Stripe redirect is in flight */}
                <span className="sr-only" aria-live="polite">
                    {isRedirecting ? pick(MODAL_COPY.redirecting, language) : ""}
                </span>
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                        <Crown className="h-6 w-6 text-primary dark:text-mint" />
                    </div>
                    <h2 id="upgrade-modal-title" className="mt-4 text-xl font-black text-foreground">{copy.headline}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
                </div>

                {/* Current → recommended (Plus) */}
                <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        {pick(MODAL_COPY.currentPlan, language)}: <PlanBadge tier={tier} />
                    </span>
                    <span aria-hidden>→</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                        <PlanBadge tier="pro" />
                    </span>
                </div>
                <p className="mt-1 text-center text-kicker font-bold uppercase tracking-widest text-primary dark:text-mint">
                    {pick(MODAL_COPY.recommendedTag, language)}
                </p>

                {/* Benefits (what Plus unlocks) */}
                <ul className="mt-5 space-y-2">
                    {copy.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                            {benefit}
                        </li>
                    ))}
                </ul>

                {/* Billing period toggle */}
                <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1" role="radiogroup">
                    {(["monthly", "annual"] as const).map((period) => (
                        <button
                            key={period}
                            type="button"
                            role="radio"
                            aria-checked={billingPeriod === period}
                            onClick={() => selectPeriod(period)}
                            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                billingPeriod === period
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {period === "monthly" ? pick(MODAL_COPY.monthly, language) : pick(MODAL_COPY.annual, language)}
                            {period === "annual" && (
                                <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-kicker font-black uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-mint">
                                    {pick(MODAL_COPY.savings, language)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Primary CTA — Plus (recommended) */}
                <button
                    type="button"
                    onClick={() => startCheckout(PLUS.planId, "pro", "plus_selected")}
                    disabled={isRedirecting}
                    aria-busy={redirectingPlan === PLUS.planId}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                    {redirectingPlan === PLUS.planId && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {pick(MODAL_COPY.plusPrefix, language)} {formatEur(plusPrice)}{suffix}
                </button>
                {PLUS.trialDays > 0 && (
                    <p className="mt-1.5 text-center text-xs font-semibold text-primary dark:text-mint">
                        {pick(MODAL_COPY.trial, language)}
                    </p>
                )}

                {/* Secondary CTA — Starter (cheaper entry) */}
                <button
                    type="button"
                    onClick={() => startCheckout(STARTER.planId, "plus", "starter_selected")}
                    disabled={isRedirecting}
                    aria-busy={redirectingPlan === STARTER.planId}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-transparent py-3.5 text-sm font-bold text-foreground transition-all hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    {redirectingPlan === STARTER.planId && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {pick(MODAL_COPY.starterPrefix, language)} {formatEur(starterPrice)}{suffix}
                </button>

                {/* Tertiary — dismiss */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={isRedirecting}
                    className="mt-3 w-full rounded text-center text-xs text-muted-foreground underline transition-colors hover:text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    {pick(MODAL_COPY.notNow, language)}
                </button>

                <div className="mt-4">
                    <BillingTrustBox text={copy.trust} />
                </div>
            </div>
        </Modal>
    )
}
