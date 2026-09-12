"use client"

/**
 * Post-onboarding continuity card: the plan the user picked at signup was
 * carried through onboarding but never activated. This surfaces it once on
 * the home page and takes them straight to checkout for THAT plan — no
 * re-selection. Dismissal is remembered locally so it never nags.
 */

import { useEffect, useRef, useState } from "react"
import { Crown } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { getUpgradeCopy } from "@/lib/monetization"
import { planTierName } from "@/lib/subscription-copy"
import { BillingTrustBox } from "./BillingTrustBox"

const DISMISS_KEY = "pw-carried-plan-dismissed"

/**
 * Plan id → the ONE customer-facing name. This map used to hold its own pair
 * («Starter»/«Plus»), which disagreed with every other surface and made «Plus»
 * the name of two different plans at two different prices. It now resolves
 * through `planTierName`, the single source.
 */
const PLAN_TIER: Record<string, "plus" | "pro"> = {
    "ph-plus": "plus",
    "ph-pro": "pro",
}

const COPY = {
    checkoutFailed: {
        el: "Δεν ήταν δυνατή η έναρξη της πληρωμής. Δοκιμάστε ξανά.",
        en: "We couldn't start the checkout. Please try again.",
    },
    headline: {
        el: "Το πλάνο που επέλεξες σε περιμένει",
        en: "The plan you picked is waiting for you",
    },
    body: {
        el: "Κατά την εγγραφή διαλέξατε το {plan}. Ενεργοποιήστε το για πλήρη ανάλυση AI, περισσότερα ασφαλιστήρια και υπενθυμίσεις.",
        en: "You chose {plan} at signup. Activate it to unlock full AI analysis, more policies and smart reminders.",
    },
    cta: { el: "Ενεργοποίηση {plan}", en: "Activate {plan}" },
    dismiss: { el: "Όχι τώρα", en: "Not now" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

interface CarriedPlanCardProps {
    planId: "ph-plus" | "ph-pro"
    billingPeriod: "monthly" | "annual"
    className?: string
}

export function CarriedPlanCard({ planId, billingPeriod, className = "" }: CarriedPlanCardProps) {
    const { language } = useLanguage()
    const [visible, setVisible] = useState(false)
    const [starting, setStarting] = useState(false)
    const viewedRef = useRef(false)

    const tier = PLAN_TIER[planId]
    const planLabel = tier ? planTierName(tier, language) : planId

    useEffect(() => {
        try {
            if (window.localStorage.getItem(DISMISS_KEY)) return
        } catch {
            // storage unavailable — still show the card
        }
        setVisible(true)
        if (!viewedRef.current) {
            viewedRef.current = true
            trackJourneyEvent("upgrade_trigger_viewed", {
                trigger_source: "carried_plan",
                plan: planId,
                billing_period: billingPeriod,
                locale: language,
            })
        }
    }, [planId, billingPeriod, language])

    if (!visible) return null

    const startCheckout = async () => {
        if (starting) return
        setStarting(true)
        trackJourneyEvent("upgrade_trigger_clicked", {
            trigger_source: "carried_plan",
            plan: planId,
            billing_period: billingPeriod,
        })
        try {
            const res = await fetch("/api/v1/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId, billingPeriod, returnTo: "/home", triggerSource: "carried_plan" }),
            })
            const json = await res.json()
            const url = json?.data?.checkout_url
            if (res.ok && url) {
                trackJourneyEvent("checkout_started", {
                    trigger_source: "carried_plan",
                    plan: planId,
                    billing_period: billingPeriod,
                })
                window.location.href = url
                return
            }
        } catch (error) {
            console.error("[CarriedPlanCard] checkout failed", error)
        }
        // Reached on both a thrown request AND a non-ok/urlless response: the
        // button re-enabled silently, so a failed checkout was indistinguishable
        // from a slow one and the user just clicked again.
        toast.error(pick(COPY.checkoutFailed, language))
        setStarting(false)
    }

    const dismiss = () => {
        trackJourneyEvent("paywall_dismissed", {
            trigger_source: "carried_plan",
            plan: planId,
        })
        try {
            window.localStorage.setItem(DISMISS_KEY, "1")
        } catch {
            // storage unavailable — dismiss for this render only
        }
        setVisible(false)
    }

    return (
        <div className={`pw-card relative overflow-hidden border-primary/30 p-5 ${className}`}>
            <div className="pointer-events-none absolute inset-0 bg-primary/5" />
            <div className="relative">
                <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary-soft dark:bg-primary/15">
                        <Crown className="h-4 w-4 text-primary dark:text-mint" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-black dark:text-white">
                            {pick(COPY.headline, language)}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-black/60 dark:text-white/65">
                            {pick(COPY.body, language).replace("{plan}", planLabel)}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={startCheckout}
                        disabled={starting}
                        className="pw-primary-button min-h-9"
                    >
                        <Crown className="h-3.5 w-3.5" />
                        {pick(COPY.cta, language).replace("{plan}", planLabel)}
                    </button>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex min-h-[24px] items-center text-xs font-semibold text-black/60 hover:text-black/70 dark:text-white/55 dark:hover:text-white/75"
                    >
                        {pick(COPY.dismiss, language)}
                    </button>
                </div>
                <div className="mt-3">
                    <BillingTrustBox text={getUpgradeCopy("full_ai_policy_analysis", language).trust} />
                </div>
            </div>
        </div>
    )
}
