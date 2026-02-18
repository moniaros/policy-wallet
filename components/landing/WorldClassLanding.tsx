"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { ArrowRight, Bell, Brain, FileText, Lock, Shield, Users } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { BrandActionButton, BrandCard, BrandSectionHeader, BrandStat } from "@/components/ui/brand"
import { landingContent } from "@/lib/landing/content"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingContentModel, LandingLocale } from "@/types/landing-content"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

interface WorldClassLandingProps {
    locale: LandingLocale
    content?: LandingContentModel
}

const trustIconMap = {
    lock: Lock,
    shield: Shield,
    users: Users,
} as const

const featureIconMap = {
    "file-text": FileText,
    brain: Brain,
    bell: Bell,
} as const

function getLocalizedText(locale: LandingLocale, text: { el: string; en: string }) {
    return text[locale]
}

function TrustItemCard({ item }: { item: { title: string; subtitle: string; icon: "lock" | "shield" | "users" } }) {
    const Icon = trustIconMap[item.icon]
    return (
        <BrandCard className="px-5 py-4 text-sm">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <p className="font-semibold text-[var(--brand-text-primary)]">{item.title}</p>
                    <p className="mt-1 text-[var(--brand-text-muted)]">{item.subtitle}</p>
                </div>
            </div>
        </BrandCard>
    )
}

function FeatureCard({ item }: { item: { title: string; subtitle: string; icon: "file-text" | "brain" | "bell" } }) {
    const Icon = featureIconMap[item.icon]
    return (
        <BrandCard className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center">
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--brand-text-primary)]">{item.title}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{item.subtitle}</p>
        </BrandCard>
    )
}

export function WorldClassLanding({ locale, content = landingContent }: WorldClassLandingProps) {
    const pathname = usePathname()
    const t = content
    const isGreek = locale === "el"

    const trustItems = (t.landingSystem?.trustItems ?? []).map((item) => ({
        ...item,
        title: getLocalizedText(locale, item.title),
        subtitle: getLocalizedText(locale, item.subtitle),
    }))

    const featureItems = (t.landingSystem?.featureItems ?? []).map((item) => ({
        ...item,
        title: getLocalizedText(locale, item.title),
        subtitle: getLocalizedText(locale, item.subtitle),
    }))

    const socialProof = t.landingSystem?.socialProof
    const conversion = t.landingSystem?.conversion
    const heroCarousel = t.landingSystem?.heroCarousel ?? []
    const audiences = t.landingSystem?.audiences ?? []
    const urgency = t.landingSystem?.urgency
    const riskFlow = t.landingSystem?.riskFlow
    const proofAlert = t.landingSystem?.proofAlert
    const differentiator = t.landingSystem?.differentiator
    const inaction = t.landingSystem?.inaction
    const quickCheck = t.landingSystem?.quickCheck
    const [activeSlide, setActiveSlide] = useState(0)
    const prefersReducedMotion = useReducedMotion()

    useEffect(() => {
        trackLandingEvent("landing_view", { locale, path: pathname })
    }, [locale, pathname])

    useEffect(() => {
        if (heroCarousel.length <= 1) return
        const intervalId = window.setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % heroCarousel.length)
        }, prefersReducedMotion ? 9000 : 6800)
        return () => window.clearInterval(intervalId)
    }, [heroCarousel.length, prefersReducedMotion])

    const trackCta = (location: "hero_primary" | "agent" | "final" | "final_login" | "mobile_signin", action: "signup_policyholder" | "signup_agent" | "signin") => {
        trackLandingEvent("cta_click", { location, action, locale })
        if (action === "signin") {
            trackLandingEvent("signin_start", { source: location, locale })
            return
        }
        trackLandingEvent("signup_start", { role: action === "signup_agent" ? "agent" : "policyholder", source: location, locale })
    }

    return (
        <div className={`${ibmPlexSans.className} min-h-screen bg-[var(--brand-bg-canvas)] text-[var(--brand-text-primary)] dark:text-[var(--brand-text-primary)]`}>
            <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
                <div className="h-16 px-4 sm:px-6 flex items-center justify-between rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/90 backdrop-blur-xl shadow-xl shadow-emerald-900/5">
                    <PolicyWalletLogo size="sm" language={locale} />
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                            <Link
                                href="/"
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${locale === "el" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"}`}
                            >
                                EL
                            </Link>
                            <Link
                                href="/en"
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${locale === "en" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"}`}
                            >
                                EN
                            </Link>
                        </div>
                        <ThemeToggle />
                        <Link href="/auth/signin" className="hidden sm:block px-3 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
                            {conversion ? getLocalizedText(locale, conversion.signInLabel) : (isGreek ? "Σύνδεση" : "Sign in")}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 sm:pt-28 pb-20 sm:pb-0">
                <section id="hero" className="px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Shield className="w-3.5 h-3.5" />
                                {t.hero.badge[locale]}
                            </div>
                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--brand-text-primary)]">
                                {t.hero.title[locale]}
                            </h1>
                            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--brand-text-muted)] max-w-xl">
                                {t.hero.subtitle[locale]}
                            </p>
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
                                <BrandActionButton asChild>
                                    <Link href="/auth/signup?role=policyholder&source=landing_hero_primary" onClick={() => trackCta("hero_primary", "signup_policyholder")}>
                                        {t.hero.primaryCta[locale]}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                            </div>
                            <p className="mt-2.5 text-xs text-[var(--brand-text-muted)]">{t.hero.helperText?.[locale]}</p>
                            <div className="mt-2.5">
                                <Link href="/auth/signup?role=agent&source=landing_hero_agent" onClick={() => trackCta("agent", "signup_agent")} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300">
                                    {t.hero.tertiaryCta[locale]}
                                </Link>
                            </div>
                        </div>

                        {heroCarousel.length > 0 ? (
                            <div className="relative">
                                <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-emerald-300/35 to-teal-200/35 blur-3xl dark:from-emerald-800/30 dark:to-teal-900/20" />
                                <BrandCard className="relative p-4 sm:p-5 overflow-hidden bg-[var(--brand-surface-card)] border-[var(--brand-border-subtle)]">
                                    <div className="relative min-h-[300px] sm:min-h-[340px] rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-elevated)] px-5 py-6 sm:px-7 sm:py-7">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={heroCarousel[activeSlide].title[locale]}
                                                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
                                                transition={{ duration: prefersReducedMotion ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] }}
                                                className="absolute inset-0 px-5 py-6 sm:px-7 sm:py-7"
                                            >
                                                <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-text-primary)] leading-tight">
                                                    {heroCarousel[activeSlide].title[locale]}
                                                </h3>
                                                <p className="mt-3 text-sm sm:text-base text-[var(--brand-text-muted)] leading-relaxed max-w-[44ch]">
                                                    {heroCarousel[activeSlide].description[locale]}
                                                </p>
                                                {heroCarousel[activeSlide].bullets?.length ? (
                                                    <div className="mt-5 flex flex-wrap gap-2">
                                                        {heroCarousel[activeSlide].bullets.slice(0, 2).map((bullet) => (
                                                            <span key={bullet[locale]} className="text-xs sm:text-sm rounded-full border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] px-3 py-1.5 text-[var(--brand-text-primary)]">
                                                                {bullet[locale]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                {heroCarousel[activeSlide].footnote ? (
                                                    <p className="mt-4 text-xs text-[var(--brand-text-muted)]">{heroCarousel[activeSlide].footnote[locale]}</p>
                                                ) : null}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2" role="tablist" aria-label={isGreek ? "Μηνύματα landing" : "Landing messages"}>
                                        {heroCarousel.map((item, index) => (
                                            <button
                                                key={item.title.el}
                                                type="button"
                                                onClick={() => setActiveSlide(index)}
                                                className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${index === activeSlide ? "w-8 bg-emerald-600" : "w-2.5 bg-slate-300 dark:bg-slate-600"}`}
                                                aria-label={`${isGreek ? "Μήνυμα" : "Message"} ${index + 1}`}
                                                aria-selected={index === activeSlide}
                                            />
                                        ))}
                                    </div>
                                </BrandCard>
                            </div>
                        ) : null}
                    </div>
                </section>

                <section id="urgency" className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
                    <div className="max-w-7xl mx-auto">
                        <BrandCard className="p-5 sm:p-6 border-red-200/80 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20">
                            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-text-primary)]">{urgency?.title[locale]}</h2>
                            <ul className="mt-4 space-y-2 text-sm sm:text-base text-[var(--brand-text-muted)]">
                                {urgency?.bullets.map((bullet) => (
                                    <li key={bullet[locale]} className="flex items-start gap-2">
                                        <span className="mt-1 text-red-600">•</span>
                                        <span>{bullet[locale]}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-5 font-semibold text-red-700 dark:text-red-300">{urgency?.conclusion[locale]}</p>
                        </BrandCard>
                    </div>
                </section>

                <section id="trust-strip" className="px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {trustItems.map((item) => (
                                <TrustItemCard key={item.title} item={item} />
                            ))}
                        </div>
                    </div>
                </section>

                <section id="core-features" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader
                            title={riskFlow?.title[locale] || (isGreek ? "Τρία βήματα για πλήρη εικόνα κάλυψης" : "Three steps to full coverage clarity")}
                        />
                        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                            <span>{riskFlow?.scoreLabel[locale] || "Coverage Score"}:</span>
                            <span>{riskFlow?.scoreValue || "68/100"}</span>
                        </div>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {featureItems.map((item) => (
                                <FeatureCard key={item.title} item={item} />
                            ))}
                        </div>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {riskFlow?.steps.map((step) => (
                                <BrandCard key={step.title[locale]} className="p-5">
                                    <h3 className="text-base font-semibold text-[var(--brand-text-primary)]">{step.title[locale]}</h3>
                                    <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{step.description[locale]}</p>
                                </BrandCard>
                            ))}
                        </div>
                        <BrandCard className="mt-6 p-5 border-red-200/80 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20">
                            <p className="text-base font-bold text-red-700 dark:text-red-300">{proofAlert?.title[locale]}</p>
                            <p className="mt-1 text-sm text-red-700/90 dark:text-red-200">{proofAlert?.subtitle[locale]}</p>
                        </BrandCard>
                    </div>
                </section>

                <section id="differentiator" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-text-primary)]">{differentiator?.title[locale]}</h2>
                            <ul className="mt-4 space-y-2 text-sm sm:text-base text-[var(--brand-text-muted)]">
                                {differentiator?.bullets.map((bullet) => (
                                    <li key={bullet[locale]} className="flex items-start gap-2">
                                        <span className="mt-1 text-[var(--brand-accent-trust)]">•</span>
                                        <span>{bullet[locale]}</span>
                                    </li>
                                ))}
                            </ul>
                        </BrandCard>
                    </div>
                </section>

                {audiences.length ? (
                    <section id="audiences" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                        <div className="max-w-7xl mx-auto">
                            <BrandSectionHeader
                                title={isGreek ? "Ποιος ωφελείται περισσότερο" : "Who benefits most"}
                                subtitle={isGreek ? "Επίλεξε το σενάριό σου και δες τι να ελέγξεις άμεσα." : "Choose your scenario and see what to check right away."}
                            />
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {audiences.map((audience) => (
                                    <BrandCard key={audience.title[locale]} className="p-5">
                                        <h3 className="text-lg font-bold text-[var(--brand-text-primary)]">{audience.title[locale]}</h3>
                                        <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{audience.subtitle[locale]}</p>
                                        <ul className="mt-4 space-y-2 text-sm text-[var(--brand-text-primary)]">
                                            {audience.bullets.map((bullet) => (
                                                <li key={bullet[locale]}>• {bullet[locale]}</li>
                                            ))}
                                        </ul>
                                        {audience.highlights?.length ? (
                                            <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{audience.highlights[0][locale]}</p>
                                        ) : null}
                                        <Link href="/auth/signup?role=policyholder&source=landing_audience" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300">
                                            {audience.ctaLabel[locale]}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </BrandCard>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : null}

                <section id="social-proof" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
                            <BrandCard className="p-6">
                                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-text-primary)]">{socialProof?.title[locale]}</h2>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    {socialProof?.metrics.map((metric) => (
                                        <BrandStat key={`${metric.value}-${metric.label[locale]}`} value={metric.value} label={metric.label[locale]} />
                                    ))}
                                </div>
                            </BrandCard>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {socialProof?.testimonials.map((item) => (
                                    <BrandCard key={item.author} className="p-6">
                                        <p className="text-[var(--brand-text-muted)]">"{item.quote[locale]}"</p>
                                        <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{item.author}</p>
                                    </BrandCard>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="cost-of-inaction" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={inaction?.title[locale] || (isGreek ? "Τι κοστίζει να μην ξέρεις;" : "What does not knowing cost?")} />
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {inaction?.bullets.map((bullet) => (
                                <BrandCard key={bullet[locale]} className="p-5 border-amber-200/80 dark:border-amber-900/40">
                                    <p className="text-sm font-medium text-[var(--brand-text-primary)]">{bullet[locale]}</p>
                                </BrandCard>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="quick-check" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <BrandSectionHeader title={quickCheck?.title[locale] || (isGreek ? "Δοκίμασέ το σε 60 δευτερόλεπτα" : "Try it in 60 seconds")} align="center" />
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {quickCheck?.bullets.map((bullet) => (
                                    <div key={bullet[locale]} className="rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-elevated)] px-4 py-3 text-sm font-medium text-center text-[var(--brand-text-primary)]">
                                        {bullet[locale]}
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-center text-xs text-[var(--brand-text-muted)]">{quickCheck?.footnote[locale]}</p>
                        </BrandCard>
                    </div>
                </section>

                <section id="final-cta" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-3xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <BrandSectionHeader title={conversion?.title[locale] || "Get started"} subtitle={conversion?.subtitle[locale]} align="center" />
                            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                                <BrandActionButton asChild className="flex-1" onClick={() => trackCta("final", "signup_policyholder")}>
                                    <Link href="/auth/signup?source=landing_final_signup">
                                        {conversion?.signupLabel[locale] || "Sign up"}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild variant="secondary" className="flex-1" onClick={() => trackCta("final_login", "signin")}>
                                    <Link href="/auth/signin?source=landing_final_login">{conversion?.loginLabel[locale] || "Login"}</Link>
                                </BrandActionButton>
                            </div>
                            <p className="mt-3 text-xs text-[var(--brand-text-muted)] text-center">{conversion?.footnote[locale]}</p>
                        </BrandCard>
                    </div>
                </section>

                <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto">
                        <BrandSectionHeader title={t.faq.title[locale]} align="center" />
                        <div className="mt-6 grid grid-cols-1 gap-3">
                            {t.faq.items.map((item) => (
                                <BrandCard key={item.id} className="p-5">
                                    <p className="font-semibold text-[var(--brand-text-primary)]">{item.question[locale]}</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-muted)]">{item.answer[locale]}</p>
                                </BrandCard>
                            ))}
                        </div>
                        <div className="mt-6 text-center">
                            <Link
                                href="/auth/signin?next=/help"
                                onClick={() => trackLandingEvent("faq_help_click", { locale })}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300"
                            >
                                {t.footer.helpLabel[locale]}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="footer-links" className="border-t border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/70 py-10 px-4 sm:px-6 lg:px-8 text-sm">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <PolicyWalletLogo size="sm" language={locale} />
                        <span className="text-[var(--brand-text-muted)]">{t.footer.linksLabel[locale]}</span>
                    </div>
                    <div className="flex items-center gap-6 text-[var(--brand-text-muted)]">
                        <Link href="/pricing" onClick={() => trackLandingEvent("pricing_click", { locale })} className="hover:text-emerald-700 dark:hover:text-emerald-300">Pricing</Link>
                        <Link href="/privacy" className="hover:text-emerald-700 dark:hover:text-emerald-300">Privacy</Link>
                        <Link href="/terms" className="hover:text-emerald-700 dark:hover:text-emerald-300">Terms</Link>
                        <Link href="/auth/signin?next=/help" className="hover:text-emerald-700 dark:hover:text-emerald-300">{t.footer.helpLabel[locale]}</Link>
                    </div>
                </div>
            </footer>

            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/95 backdrop-blur-md p-3">
                <div className="mx-auto max-w-7xl flex items-center gap-2">
                    <BrandActionButton asChild className="flex-1" onClick={() => trackCta("hero_primary", "signup_policyholder")}>
                        <Link href="/auth/signup?role=policyholder&source=landing_mobile_sticky">
                            {conversion?.mobilePrimaryLabel[locale] || (isGreek ? "Ξεκίνα δωρεάν" : "Start free")}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </BrandActionButton>
                    <BrandActionButton
                        asChild
                        variant="secondary"
                        className="px-3.5"
                        onClick={() => trackCta("mobile_signin", "signin")}
                        aria-label={conversion?.signInLabel[locale] || (isGreek ? "Σύνδεση" : "Sign in")}
                    >
                        <Link href="/auth/signin?source=landing_mobile_sticky_signin">{conversion?.signInLabel[locale] || (isGreek ? "Σύνδεση" : "Sign in")}</Link>
                    </BrandActionButton>
                </div>
            </div>
        </div>
    )
}
