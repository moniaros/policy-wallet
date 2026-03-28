"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/contexts/LanguageContext"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { PricingCard } from "@/components/pricing/PricingCard"
import { FeatureComparison } from "@/components/pricing/FeatureComparison"
import { PricingFAQ } from "@/components/pricing/PricingFAQ"
import {
    BillingPeriod,
    PricingAudience,
    PublicPricingPlan,
    publicPricingContent,
} from "@/lib/pricing/public-pricing-content"
import { CreditCard, Lock, Menu, Shield, X } from "lucide-react"
import { trackJourneyEvent } from "@/lib/journey/funnel"

export default function PricingPage() {
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const { language, setLanguage } = useLanguage()
    const supabase = createClient()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [audience, setAudience] = useState<PricingAudience>("policyholder")
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")
    const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null)

    const content = useMemo(() => publicPricingContent[audience], [audience])

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
        dashboard: { el: "Πίνακας Ελέγχου", en: "Dashboard" },
        pricing: { el: "Τιμολόγηση", en: "Pricing" },
        products: { el: "Προϊόντα", en: "Products" },
        company: { el: "Εταιρεία", en: "Company" },
    } as const

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, authSession) => setSession(authSession))
        return () => subscription.unsubscribe()
    }, [supabase])

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
            router.push("/contact")
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 selection:bg-[#64748B]/20 selection:text-[#0F172A] dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <header className="fixed left-4 right-4 top-4 z-50">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full border border-gray-200/50 bg-white/80 px-6 shadow-sm backdrop-blur-xl transition-all duration-300 dark:border-slate-700/50 dark:bg-slate-900/80">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A] dark:text-white">Policy</span>
                        <span className="text-[#64748B] dark:text-slate-400">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-[14px] font-medium text-[#475569] dark:text-slate-300 md:flex">
                        <Link href="/product" className="transition-colors hover:text-[#0F172A] dark:hover:text-white">
                            {labels.products[language]}
                        </Link>
                        <SolutionsDropdown language={language} />
                        <Link href="/company" className="transition-colors hover:text-[#0F172A] dark:hover:text-white">
                            {labels.company[language]}
                        </Link>
                        <Link href="/pricing" className="text-[#0F172A] transition-colors dark:text-white">
                            {labels.pricing[language]}
                        </Link>
                    </nav>

                    <div className="hidden items-center gap-5 md:flex">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setLanguage("el")}
                                className={`text-xs font-semibold transition-colors ${
                                    language === "el"
                                        ? "text-[#0F172A] dark:text-white"
                                        : "text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white"
                                }`}
                            >
                                EL
                            </button>
                            <span className="text-[#E2E8F0] dark:text-slate-700">|</span>
                            <button
                                onClick={() => setLanguage("en")}
                                className={`text-xs font-semibold transition-colors ${
                                    language === "en"
                                        ? "text-[#0F172A] dark:text-white"
                                        : "text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white"
                                }`}
                            >
                                EN
                            </button>
                        </div>
                        <ThemeToggle />
                        {session ? (
                            <Link
                                href="/wallet"
                                className="text-[14px] font-medium text-[#0F172A] transition-colors hover:text-[#64748B] dark:text-white"
                            >
                                {labels.dashboard[language]}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="text-[14px] font-medium text-[#0F172A] transition-colors hover:text-[#64748B] dark:text-white"
                                >
                                    {labels.signin[language]}
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
                                >
                                    {labels.getStarted[language]}
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4 md:hidden">
                        <ThemeToggle />
                        <button
                            className="p-2 -mr-2 text-[#0F172A] dark:text-white"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div
                className={`fixed inset-0 z-[100] flex flex-col bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
                }`}
            >
                <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6 pt-4">
                    <Link
                        href="/"
                        className="inline-flex items-center text-[20px] font-bold tracking-tight"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <button
                        className="rounded-full p-2 -mr-2 text-white transition-colors hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-8 pb-24 sm:px-12">
                    <nav className="mb-12 flex flex-col gap-6 text-[44px] font-medium leading-tight tracking-tight sm:text-[56px]">
                        <Link
                            href="/product"
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {labels.products[language]}
                        </Link>
                        <SolutionsMobileGroup language={language} onNavigate={() => setIsMobileMenuOpen(false)} className="text-[20px] sm:text-[22px]" />
                        <Link
                            href="/company"
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {labels.company[language]}
                        </Link>
                        <Link
                            href="/pricing"
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {labels.pricing[language]}
                        </Link>
                    </nav>
                </div>
            </div>

            <section className="px-4 pb-12 pt-20 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl text-center">
                    <h1 className="mb-4 text-4xl font-black leading-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
                        {labels.heading[language]}
                    </h1>
                    <p className="mx-auto mb-12 max-w-3xl text-xl text-slate-600 dark:text-slate-300">
                        {labels.subtitle[language]}
                    </p>

                    <div className="mb-10 flex justify-center">
                        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                            <button
                                onClick={() => setAudience("policyholder")}
                                className={`rounded-xl px-5 py-2 text-sm font-bold transition-colors ${
                                    audience === "policyholder"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.audiencePolicyholder[language]}
                            </button>
                            <button
                                onClick={() => setAudience("agent")}
                                className={`rounded-xl px-5 py-2 text-sm font-bold transition-colors ${
                                    audience === "agent"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.audienceAgent[language]}
                            </button>
                        </div>
                    </div>

                    <h2 className="mb-3 text-2xl font-black text-slate-900 dark:text-white">{content.heading[language]}</h2>
                    <p className="mx-auto mb-12 max-w-3xl text-base text-slate-600 dark:text-slate-300">
                        {content.subtitle[language]}
                    </p>

                    <div className="mb-12 flex justify-center">
                        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                            <button
                                onClick={() => setBillingPeriod("monthly")}
                                className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-colors ${
                                    billingPeriod === "monthly"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.monthly[language]}
                            </button>
                            <button
                                onClick={() => setBillingPeriod("annual")}
                                className={`relative rounded-xl px-6 py-2.5 text-sm font-bold transition-colors ${
                                    billingPeriod === "annual"
                                        ? "bg-[#29685B] text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {labels.annual[language]}
                                <span className="absolute -right-2 -top-3 rounded-full bg-[#89D9B2] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#0F172A]">
                                    {language === "el" ? "Έκπτωση" : "Save"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mb-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span>{labels.secure[language]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span>{labels.noHiddenFees[language]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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

            <section className="bg-white px-4 py-20 dark:bg-slate-900/50 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <h2 className="mb-12 text-center text-3xl font-black text-slate-900 dark:text-white md:text-4xl">
                        {content.comparisonTitle[language]}
                    </h2>
                    <FeatureComparison language={language} plans={content.plans} rows={content.comparisonRows} />
                </div>
            </section>

            <section id="pricing-faq" className="scroll-mt-32 px-4 py-20 sm:px-6 lg:scroll-mt-40 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <h2 className="mb-12 text-center text-3xl font-black text-slate-900 dark:text-white md:text-4xl">
                        {content.faqTitle[language]}
                    </h2>
                    <PricingFAQ language={language} items={content.faqItems} />
                </div>
            </section>

            <PublicMegaFooter locale={language} />
        </div>
    )
}
