"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { localizeHref } from "@/lib/seo/locale-links"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PricingCard } from "@/components/pricing/PricingCard"
import { FeatureComparison } from "@/components/pricing/FeatureComparison"
import { PricingFAQ } from "@/components/pricing/PricingFAQ"
import {
    BillingPeriod,
    PricingAudience,
    PublicPricingAudienceContent,
    PublicPricingPlan,
    publicPricingContent,
} from "@/lib/pricing/public-pricing-content"
import { CreditCard, Lock, Menu, Shield, X } from "lucide-react"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { PartnerPerksSection } from "@/components/landing/PartnerPerksSection"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"

export default function PricingPage({
    // Server pages pass the catalog-built content (live admin-managed prices);
    // the static template is only the fallback for stray direct renders.
    pricingContent = publicPricingContent,
    partnerOffers = [],
}: {
    pricingContent?: Record<PricingAudience, PublicPricingAudienceContent>
    partnerOffers?: PartnerOfferView[]
}) {
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const { language, setLanguage } = useLanguage()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [audience, setAudience] = useState<PricingAudience>("policyholder")
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")
    const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null)

    const content = useMemo(() => pricingContent[audience], [pricingContent, audience])
    // EN context navigates within the /en tree (unmirrored targets stay Greek).
    const l = (href: string) => localizeHref(href, language)

    const labels = {
        heading: {
            el: "Επιλέξτε το πλάνο που ταιριάζει σε εσάς",
            en: "Choose the plan that fits your needs",
        },
        subtitle: {
            el: "Αλλάξτε πλάνο οποιαδήποτε στιγμή. Χωρίς κρυφές χρεώσεις.",
            en: "Switch plans anytime. No hidden fees.",
        },
        audiencePolicyholder: {
            el: "Ιδιώτες",
            en: "Individuals",
        },
        audienceAgent: {
            el: "Πράκτορες & Πρακτορεία",
            en: "Agents & Agencies",
        },
        monthly: {
            el: "Μηνιαία χρέωση",
            en: "Monthly billing",
        },
        annual: {
            el: "Ετήσια χρέωση",
            en: "Yearly billing",
        },
        annualSavings: {
            el: "Έκπτωση",
            en: "Save",
        },
        cancelAnytime: {
            el: "Ακύρωση ανά πάσα στιγμή",
            en: "Cancel anytime",
        },
        noHiddenFees: {
            el: "Χωρίς κρυφές χρεώσεις",
            en: "No hidden fees",
        },
        secure: {
            el: "Ασφαλής πληρωμή με Stripe",
            en: "Secure payment with Stripe",
        },
        signin: { el: "Σύνδεση", en: "Log in" },
        getStarted: { el: "Ξεκινήστε", en: "Get started" },
        viewAccount: { el: "Διαχείριση λογαριασμού", en: "Manage account" },
        choosePlan: { el: "Επιλογή πλάνου", en: "Choose plan" },
        contactSales: { el: "Επικοινωνία πωλήσεων", en: "Contact sales" },
        dashboard: { el: "Πίνακας ελέγχου", en: "Dashboard" },
        pricing: { el: "Τιμολόγηση", en: "Pricing" },
        products: { el: "Προϊόντα", en: "Products" },
        company: { el: "Εταιρεία", en: "Company" },
        openMenu: { el: "Άνοιγμα μενού", en: "Open menu" },
        closeMenu: { el: "Κλείσιμο μενού", en: "Close menu" },
    } as const

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    // supabase-js is ~47 KB gzip and is only needed to resolve the session-aware
    // CTA *after* mount — the server already renders the anonymous CTA, since
    // `session` starts as null. Importing it lazily therefore keeps this page's
    // behaviour identical while dropping the SDK out of its first-load JS.
    useEffect(() => {
        let cancelled = false
        let unsubscribe: (() => void) | undefined

        import("@/lib/supabase/client").then(({ createClient }) => {
            if (cancelled) return
            const supabase = createClient()
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!cancelled) setSession(session)
            })
            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, authSession) => {
                if (!cancelled) setSession(authSession)
            })
            unsubscribe = () => subscription.unsubscribe()
        })

        return () => {
            cancelled = true
            unsubscribe?.()
        }
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const params = new URLSearchParams(window.location.search)
        const requestedAudience = params.get("audience")
        if (requestedAudience === "agent") {
            setAudience("agent")
        }
        if (params.get("success") === "true") {
            trackJourneyEvent("upgrade_completed", { source: "public_pricing_return" })
        }
    }, [])

    const getPlanActionLabel = (plan: PublicPricingPlan) => {
        if (plan.isContactPlan) return labels.contactSales
        if (!session) return labels.getStarted
        if (!plan.checkoutPlanId) return labels.viewAccount
        return labels.choosePlan
    }

    const handleSelectPlan = async (plan: PublicPricingPlan) => {
        if (plan.isContactPlan) {
            router.push(l("/contact"))
            return
        }

        if (!session) {
            const role = audience === "agent" ? "agent" : "policyholder"
            const planParam = plan.checkoutPlanId ?? plan.key
            router.push(
                `/auth/signup?role=${role}&plan=${encodeURIComponent(planParam)}&billing=${billingPeriod}`
            )
            return
        }

        if (!plan.checkoutPlanId) {
            router.push("/account")
            return
        }

        trackJourneyEvent("upgrade_started", {
            tier: plan.key,
            source: `public_pricing_${audience}_${billingPeriod}`,
        })

        setLoadingPlanKey(plan.key)
        try {
            const response = await fetch("/api/v1/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: plan.checkoutPlanId, billingPeriod }),
            })

            const payload = await response.json()
            const checkoutUrl = payload?.data?.checkout_url as string | undefined

            if (!response.ok || !checkoutUrl) {
                throw new Error(payload?.error?.message || "Checkout initialization failed")
            }

            window.location.href = checkoutUrl
        } catch (error) {
            console.error("Failed to create checkout session:", error)
        } finally {
            setLoadingPlanKey(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#ECFDF5] selection:bg-[#29685B]/20 selection:text-[#0F172A] dark:from-slate-950 dark:via-slate-900 dark:to-[#0B1F1A]">
            <PublicHeader locale={language} ctaSource="public_pricing_nav" />

            <main id="main-content" tabIndex={-1}>
            <section className="px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pt-36">
                <div className="mx-auto max-w-7xl text-center">
                    <h1 className="mb-4 text-4xl font-bold leading-tight text-slate-900 dark:text-white md:text-5xl">
                        {labels.heading[language]}
                    </h1>
                    <p className="mx-auto mb-12 max-w-3xl text-xl text-slate-600 dark:text-slate-300">
                        {labels.subtitle[language]}
                    </p>

                    <div className="mb-10 flex justify-center">
                        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                            <button
                                onClick={() => setAudience("policyholder")}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                                    audience === "policyholder"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.audiencePolicyholder[language]}
                            </button>
                            <button
                                onClick={() => setAudience("agent")}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                                    audience === "agent"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.audienceAgent[language]}
                            </button>
                        </div>
                    </div>

                    <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">{content.heading[language]}</h2>
                    <p className="mx-auto mb-12 max-w-3xl text-base text-slate-600 dark:text-slate-300">
                        {content.subtitle[language]}
                    </p>

                    <div className="mb-12 flex justify-center">
                        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                            <button
                                onClick={() => setBillingPeriod("monthly")}
                                className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                                    billingPeriod === "monthly"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.monthly[language]}
                            </button>
                            <button
                                onClick={() => setBillingPeriod("annual")}
                                className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                                    billingPeriod === "annual"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.annual[language]}
                                <span className="absolute -right-2 -top-3 rounded-full bg-[#89D9B2] px-2 py-0.5 text-kicker font-bold uppercase tracking-wide text-[#0F172A] dark:text-white">
                                    {labels.annualSavings[language]}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mb-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span>{labels.secure[language]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span>{labels.noHiddenFees[language]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span>{labels.cancelAnytime[language]}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className={`grid grid-cols-1 gap-8 ${content.plans.length === 4 ? "lg:grid-cols-2 2xl:grid-cols-4" : "md:grid-cols-3"}`}>
                        {content.plans.map((plan) => (
                            <PricingCard
                                key={plan.key}
                                plan={plan}
                                language={language}
                                billingPeriod={billingPeriod}
                                actionLabel={getPlanActionLabel(plan)}
                                isLoading={loadingPlanKey === plan.key}
                                onSelectPlan={handleSelectPlan}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Partner benefits — renders only with live partners (honesty rule). */}
            <PartnerPerksSection offers={partnerOffers} isGreek={language === "el"} id="partner-perks" />

            <section className="bg-white px-4 py-20 dark:bg-slate-900/50 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                        {content.comparisonTitle[language]}
                    </h2>
                    <FeatureComparison language={language} plans={content.plans} rows={content.comparisonRows} />
                </div>
            </section>

            <section id="pricing-faq" className="scroll-mt-32 px-4 py-20 sm:px-6 lg:scroll-mt-40 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                        {content.faqTitle[language]}
                    </h2>
                    <PricingFAQ language={language} items={content.faqItems} />
                </div>
            </section>
            </main>

            <PublicMegaFooter locale={language} />
        </div>
    )
}
