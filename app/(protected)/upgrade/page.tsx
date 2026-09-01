"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { PricingComparison } from '@/components/account/PricingComparison'
import { getSubscriptionCopy } from '@/lib/subscription-copy'
import { upgradeSubscription } from "@/app/(protected)/me/actions"
import { trackJourneyEvent } from '@/lib/journey/funnel'

const TIER_TO_PLAN_ID: Record<string, string> = {
    free: 'ph-free',
    plus: 'ph-plus',
    pro: 'ph-pro',
}

const UPGRADE_COPY = {
    redirecting: { el: 'Μετάβαση σε ασφαλή πληρωμή...', en: 'Redirecting to secure payment...' },
    genericError: { el: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.', en: 'Something went wrong. Please try again.' },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === 'el' ? pair.el : pair.en

export default function PricingPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t, language } = useLanguage()
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

    // Real current plan (was hardcoded 'ph-free' — paid users saw themselves
    // as free). The tokens/usage endpoint already returns the resolved tier.
    const [currentPlanId, setCurrentPlanId] = useState('ph-free')
    useEffect(() => {
        fetch('/api/v1/tokens/usage')
            .then((res) => (res.ok ? res.json() : null))
            .then((payload) => {
                const tier = payload?.data?.tier || payload?.tier
                if (tier && TIER_TO_PLAN_ID[tier]) setCurrentPlanId(TIER_TO_PLAN_ID[tier])
            })
            .catch(() => { /* keep free default */ })
    }, [])

    // Context preservation: the trigger that sent the user here passes
    // ?return=<path>; after Stripe, /upgrade/success deep-links back to it.
    const returnTo = searchParams.get('return') || undefined
    const triggerReason = searchParams.get('reason') || 'direct'

    useEffect(() => {
        trackJourneyEvent('pricing_viewed', {
            screen: 'protected_upgrade_page',
            trigger_source: triggerReason,
        })
    }, [triggerReason])

    const handleSubscribe = async (planId: string, billingPeriod: 'monthly' | 'annual') => {
        if (planId === currentPlanId) return

        setLoadingPlanId(planId)
        try {
            const result = await upgradeSubscription(planId, billingPeriod, returnTo)

            if (result.error) {
                toast.error(result.error)
                return
            }

            if (result.url) {
                trackJourneyEvent('upgrade_started', {
                    source: `protected_upgrade_page:${triggerReason}:${billingPeriod}`,
                    tier: planId,
                })
                toast.success(pick(UPGRADE_COPY.redirecting, language))
                // Keep the button in its processing state through the redirect —
                // the old `finally` cleared it synchronously, so the CTA looked
                // idle/clickable again during the 800ms toast wait + navigation.
                setTimeout(() => {
                    window.location.href = result.url!
                }, 800)
                return
            }

            // Neither url nor error — unexpected; release the button.
            setLoadingPlanId(null)
        } catch (error) {
            toast.error(pick(UPGRADE_COPY.genericError, language))
            setLoadingPlanId(null)
        }
    }

    const headingTitle = getSubscriptionCopy('headings.pricing.title', language)
    const headingSubtitle = getSubscriptionCopy('headings.pricing.subtitle', language)
    const secureText = getSubscriptionCopy('trust.secure', language)
    const badgeText = getSubscriptionCopy('headings.pricing.badge', language)
    const cancelAnytimeText = getSubscriptionCopy('trust.cancelAnytime', language)
    const noHiddenFeesText = getSubscriptionCopy('trust.noHiddenFees', language)

    return (
        <div className="relative overflow-hidden pb-20">
            {/* High-Fidelity Background Patterns */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-action-primary-bg/5 blur-[120px] rounded-full"></div>
                <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-action-primary-bg/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-surface-sunken/40"></div>

                {/* Geometric Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                        backgroundSize: '32px 32px'
                    }}>
                </div>
            </div>

            {/* Header / Nav */}
            <div className="sticky top-0 z-50 bg-surface-base/80 backdrop-blur-xl border-b border-border-subtle">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex min-h-11 items-center gap-2 rounded-g-control text-fg-secondary transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-bold text-sm">{t.common.back}</span>
                    </button>
                    <div className="flex items-center gap-2 text-fg-secondary text-xs font-bold">
                        <ShieldCheck className="w-4 h-4 text-fg-brand" />
                        {secureText}
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="pt-24 pb-16 text-center px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-wash border border-border-subtle text-fg-brand text-xs font-black mb-8">
                        <Zap className="w-3.5 h-3.5" />
                        {badgeText}
                    </div>
                    <div data-wide className="hidden" />
                    <h1 className="text-5xl md:text-7xl font-black text-fg-primary mb-8 tracking-tighter leading-none">
                        {headingTitle}
                    </h1>
                    <p className="text-xl text-fg-secondary max-w-2xl mx-auto leading-relaxed font-bold">
                        {headingSubtitle}
                    </p>
                </motion.div>
            </div>

            <div className="relative z-10">
                {/* Pricing Comparison */}
                <PricingComparison
                    currentPlanId={currentPlanId}
                    onSelectPlan={handleSubscribe}
                    loadingPlanId={loadingPlanId}
                />
            </div>

            {/* Honest trust signals (the fake insurer-logo wall is gone) */}
            <div className="mt-20 border-t border-border-subtle pt-16 relative z-10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center items-center gap-3">
                        {[secureText, cancelAnytimeText, noHiddenFeesText].map((text) => (
                            <span
                                key={text}
                                className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-4 py-2 text-xs font-bold text-fg-secondary"
                            >
                                <ShieldCheck className="h-3.5 w-3.5 text-fg-brand" />
                                {text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

