"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Star, Shield, Zap } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'
import { usePlanFacts } from '@/components/monetization/PlanFactsProvider'
import { formatEur } from '@/lib/pricing/pricing-view-model'
import { useLanguage } from '@/contexts/LanguageContext'
import { trackJourneyEvent } from '@/lib/journey/funnel'

interface PricingComparisonProps {
    currentPlanId?: string
    /** The selected billing period is authoritative — checkout must honour it. */
    onSelectPlan: (planId: string, billingPeriod: 'monthly' | 'annual') => void
    loadingPlanId?: string | null
}

interface PlanTier {
    id: string
    name: Record<string, string>
    description: Record<string, string>
    price: Record<string, string>
    period: Record<string, string>
    badge?: Record<string, string>
    popular?: boolean
    annual?: {
        price: Record<string, string>
        period: Record<string, string>
        savings: Record<string, string>
    }
    icon: any
    features: Array<{ name: string; included: boolean }>
}

export function PricingComparison({ currentPlanId, onSelectPlan, loadingPlanId }: PricingComparisonProps) {
    const { language } = useLanguage()
    const copy = subscriptionCopy
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

    // Live admin-managed prices/caps (PlanFactsProvider); the subscription-copy
    // literals below act only as the render fallback inside usePlanFacts.
    const { tierPricing, freePolicyLimit, plusPolicyLimit } = usePlanFacts()
    const starterFacts = tierPricing('plus')
    const plusFacts = tierPricing('pro')
    const asCount = (limit: number | null) => (limit == null ? '∞' : String(limit))
    const bothLangs = (value: string) => ({ el: value, en: value })

    const selectBillingPeriod = (period: 'monthly' | 'annual') => {
        setBillingPeriod(period)
        trackJourneyEvent('billing_period_selected', {
            billing_period: period,
            screen: 'pricing_comparison',
        })
    }

    const selectPlan = (planId: string) => {
        trackJourneyEvent('plan_selected', {
            plan: planId,
            billing_period: billingPeriod,
            screen: 'pricing_comparison',
        })
        onSelectPlan(planId, billingPeriod)
    }

    const tiers: PlanTier[] = [
        {
            id: 'ph-free',
            ...copy.tiers.free,
            icon: Shield,
            features: [
                { name: copy.features.policyLimit[language].replace('{count}', asCount(freePolicyLimit)), included: true },
                { name: copy.features.basicAI[language], included: true },
                { name: copy.features.documentStorage[language], included: true },
                { name: copy.features.advancedAI[language], included: false },
                { name: copy.features.emailNotifications[language], included: false },
            ]
        },
        {
            // "Starter" (code key `plus`): organizer tier — more policies + basic
            // reminders, NO deep AI (that unlocks at Plus / code `pro`).
            id: 'ph-plus',
            ...copy.tiers.plus,
            price: bothLangs(formatEur(starterFacts.monthlyEur)),
            annual: copy.tiers.plus.annual
                ? { ...copy.tiers.plus.annual, price: bothLangs(formatEur(starterFacts.annualEur)) }
                : undefined,
            icon: Zap,
            features: [
                { name: copy.features.policyLimit[language].replace('{count}', asCount(plusPolicyLimit)), included: true },
                { name: copy.features.documentStorage[language], included: true },
                { name: copy.features.emailNotifications[language], included: true },
                { name: copy.features.basicInsights[language], included: true },
                { name: copy.features.advancedAI[language], included: false },
                { name: copy.features.interactiveQA[language], included: false },
            ]
        },
        {
            id: 'ph-pro',
            ...copy.tiers.pro,
            price: bothLangs(formatEur(plusFacts.monthlyEur)),
            annual: copy.tiers.pro.annual
                ? { ...copy.tiers.pro.annual, price: bothLangs(formatEur(plusFacts.annualEur)) }
                : undefined,
            icon: Star,
            // The highlighted tier must be the one that actually carries the
            // "Popular"/"Best value" badge — PolicyWallet Plus (code `pro`), the
            // flagship AI tier every other surface recommends. This flag used to
            // sit on Starter, which has no badge, so the emphasis ribbon rendered
            // the generic word "Upgrade" and the cheaper organizer tier was pushed
            // as the recommendation.
            popular: true,
            features: [
                { name: copy.features.unlimitedPolicies[language], included: true },
                { name: copy.features.advancedAnalytics[language], included: true },
                { name: copy.features.prioritySupport[language], included: true },
                { name: copy.features.agentCollaboration[language], included: true },
                { name: copy.features.digitalWallet[language], included: true },
            ]
        }
    ]

    const comparisonFeatures = [
        { name: copy.features.policyLimitLabel[language], free: asCount(freePolicyLimit), plus: asCount(plusPolicyLimit), pro: "∞" },
        { name: copy.features.advancedAI[language], free: false, plus: false, pro: true },
        { name: copy.features.automaticGapDetection[language], free: false, plus: false, pro: true },
        { name: copy.features.interactiveQA[language], free: false, plus: false, pro: true },
        { name: copy.features.digitalWallet[language], free: false, plus: false, pro: true },
        { name: copy.features.prioritySupport[language], free: false, plus: false, pro: true },
        { name: copy.features.advancedAnalytics[language], free: false, plus: false, pro: true },
        { name: copy.features.agentCollaboration[language], free: false, plus: false, pro: true },
    ]

    return (
        <div className="w-full max-w-7xl mx-auto px-4">

            {/* Billing toggle — drives the checkout's billingPeriod, not just the price label. */}
            <div className="flex justify-center mb-12">
                <div className="bg-muted p-1 rounded-2xl flex items-center relative" role="radiogroup" aria-label={copy.headings.pricing.badge[language]}>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={billingPeriod === 'monthly'}
                        onClick={() => selectBillingPeriod('monthly')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${billingPeriod === 'monthly'
                            ? 'text-foreground shadow-sm bg-card'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {copy.billing.monthly[language]}
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={billingPeriod === 'annual'}
                        onClick={() => selectBillingPeriod('annual')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${billingPeriod === 'annual'
                            ? 'text-foreground shadow-sm bg-card'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {copy.billing.annual[language]}
                        <span className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-kicker font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                            -20%
                        </span>
                    </button>

                    {/* Animated Background */}
                    <motion.div
                        layoutId="billingToggle"
                        aria-hidden
                        className="absolute inset-y-1 rounded-xl bg-card shadow-sm z-0"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{
                            width: '50%',
                            left: billingPeriod === 'monthly' ? '4px' : '50%'
                        }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {tiers.map((tier, index) => {
                    const isCurrent = currentPlanId === tier.id
                    const isPopular = tier.popular
                    // Free is the floor, not a checkout target — offering "Upgrade"
                    // to a paid user routed to a server call that always errored
                    // ("Plan is not purchasable"). Present it as the non-actionable
                    // base plan instead.
                    const isFreeNonCurrent = tier.id === 'ph-free' && !isCurrent
                    const isNeutral = isCurrent || isFreeNonCurrent

                    return (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-2xl p-6 border hover:shadow-2xl transition-all duration-300 group flex flex-col ${isPopular
                                ? 'bg-card border-primary shadow-xl shadow-primary/10 scale-105 z-10'
                                : 'bg-muted/40 border-border hover:border-primary/40'
                                }`}
                        >
                            {tier.id === 'ph-pro' && (
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-kicker font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl rounded-tr-[30px] shadow-lg z-20">
                                    {copy.trial.badge[language]}
                                </div>
                            )}

                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                                    {tier.badge?.[language] ?? copy.cta.upgrade[language]}
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isPopular ? 'bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    <tier.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-foreground mb-2">
                                    {tier.name[language]}
                                </h3>
                                <p className="text-sm text-muted-foreground min-h-10">
                                    {tier.description[language]}
                                </p>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-foreground tracking-tighter">
                                        {billingPeriod === 'annual' ? tier.annual?.price[language] : tier.price[language]}
                                    </span>
                                    <span className="text-sm font-bold text-muted-foreground">
                                        {billingPeriod === 'annual' ? tier.annual?.period[language] : tier.period[language]}
                                    </span>
                                </div>
                                {billingPeriod === 'annual' && tier.annual?.savings && (
                                    <span className="text-xs font-bold text-primary dark:text-mint px-2 py-1 bg-primary-soft dark:bg-primary/15 rounded-full mt-2 inline-block">
                                        {tier.annual.savings[language]}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                {tier.features.map((feature, i) => (
                                    <div key={i} className={`flex items-start gap-3 text-sm ${feature.included
                                        ? 'text-foreground'
                                        : 'text-muted-foreground line-through decoration-muted-foreground/40'
                                        }`}>
                                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${feature.included
                                            ? 'bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {feature.included ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                        </div>
                                        <span className="font-medium">{feature.name}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => selectPlan(tier.id)}
                                disabled={isNeutral || !!loadingPlanId}
                                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isNeutral
                                    ? 'bg-muted text-muted-foreground cursor-default'
                                    : loadingPlanId === tier.id
                                        ? 'bg-primary text-primary-foreground animate-pulse cursor-wait'
                                        : isPopular
                                            ? 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 cursor-pointer'
                                            : 'bg-card border-2 border-border text-foreground hover:border-primary active:scale-95 cursor-pointer'
                                    }`}
                            >
                                {isCurrent
                                    ? copy.cta.currentPlan[language]
                                    : isFreeNonCurrent
                                        ? copy.cta.basePlan[language]
                                        : loadingPlanId === tier.id
                                            ? copy.cta.processing[language]
                                            : (tier.id === 'ph-pro'
                                                ? copy.trial.cta[language]
                                                : copy.cta.upgrade[language])}
                            </button>
                        </motion.div>
                    )
                })}
            </div>

            {/* In-depth Comparison Table */}
            <div className="mt-24 mb-16 overflow-hidden">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-black text-foreground tracking-tight">
                        {copy.headings.comparison.title[language]}
                    </h2>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full text-left border-collapse">
                        <caption className="sr-only">{copy.headings.comparison.title[language]}</caption>
                        <thead>
                            <tr className="bg-muted/50">
                                <th scope="col" className="px-8 py-6 text-sm font-black text-muted-foreground uppercase tracking-widest">{copy.headings.comparison.featureColumn[language]}</th>
                                <th scope="col" className="px-8 py-6 text-sm font-black text-foreground uppercase tracking-widest">{copy.tiers.free.name[language]}</th>
                                <th scope="col" className="px-8 py-6 text-sm font-black text-primary dark:text-mint uppercase tracking-widest">{copy.tiers.plus.name[language]}</th>
                                <th scope="col" className="px-8 py-6 text-sm font-black text-primary dark:text-mint uppercase tracking-widest">{copy.tiers.pro.name[language]}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {comparisonFeatures.map((feat, i) => (
                                <tr key={i} className="hover:bg-muted/40 transition-colors">
                                    <th scope="row" className="px-8 py-5 text-sm font-bold text-left text-foreground">{feat.name}</th>
                                    <td className="px-8 py-5">
                                        {typeof feat.free === 'string' ? (
                                            <span className="text-sm font-bold text-muted-foreground">{feat.free}</span>
                                        ) : feat.free ? (
                                            <Check className="w-5 h-5 text-primary dark:text-mint" />
                                        ) : (
                                            <X className="w-5 h-5 text-muted-foreground/50" />
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {typeof feat.plus === 'string' ? (
                                            <span className="text-sm font-bold text-primary dark:text-mint">{feat.plus}</span>
                                        ) : feat.plus ? (
                                            <Check className="w-5 h-5 text-primary dark:text-mint" />
                                        ) : (
                                            <X className="w-5 h-5 text-muted-foreground/40" />
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {typeof feat.pro === 'string' ? (
                                            <span className="text-sm font-bold text-primary dark:text-mint">{feat.pro}</span>
                                        ) : feat.pro ? (
                                            <Check className="w-5 h-5 text-primary dark:text-mint" />
                                        ) : (
                                            <X className="w-5 h-5 text-muted-foreground/40" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-16 bg-muted/50 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <h2 className="text-2xl font-black text-foreground mb-8 relative z-10">
                    {copy.headings.faq.title[language]}
                </h2>
                <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto relative z-10">
                    {copy.faq.map((item, i) => (
                        <div key={i}>
                            <h4 className="font-bold text-foreground mb-2">{item.question[language]}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.answer[language]
                                    .replace('{starterAnnual}', formatEur(starterFacts.annualEur))
                                    .replace('{plusAnnual}', formatEur(plusFacts.annualEur))}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    )
}
