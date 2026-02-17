"use client"

import { useEffect } from "react"
import Image from "next/image"
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

    useEffect(() => {
        trackLandingEvent("landing_view", { locale, path: pathname })
    }, [locale, pathname])

    const trackCta = (location: "hero_primary" | "hero_secondary" | "agent" | "final", role: "policyholder" | "agent" | "invite") => {
        trackLandingEvent("cta_click", { location, role, locale })
        if (role === "invite") {
            trackLandingEvent("invite_flow_start", { source: "agent_invite", locale })
            return
        }
        trackLandingEvent("signup_start", { role, source: location, locale })
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

            <main className="pt-28 sm:pt-32 pb-24 sm:pb-0">
                <section id="hero" className="px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Shield className="w-3.5 h-3.5" />
                                {t.hero.badge[locale]}
                            </div>
                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--brand-text-primary)]">
                                {t.hero.title[locale]}
                            </h1>
                            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-[var(--brand-text-muted)] max-w-2xl">
                                {t.hero.subtitle[locale]}
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl">
                                <BrandActionButton asChild>
                                    <Link href="/auth/signup?role=policyholder&source=landing_hero_primary" onClick={() => trackCta("hero_primary", "policyholder")}>
                                        {t.hero.primaryCta[locale]}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild variant="secondary">
                                    <Link href="/auth/signin?source=landing_agent_invite" onClick={() => trackCta("hero_secondary", "invite")}>
                                        {t.hero.secondaryCta[locale]}
                                    </Link>
                                </BrandActionButton>
                            </div>
                            <p className="mt-3 text-xs text-[var(--brand-text-muted)]">{t.hero.helperText?.[locale]}</p>
                            <div className="mt-3">
                                <Link href="/auth/signup?role=agent&source=landing_hero_agent" onClick={() => trackCta("agent", "agent")} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300">
                                    {t.hero.tertiaryCta[locale]}
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-emerald-300/30 to-teal-200/30 blur-3xl dark:from-emerald-800/30 dark:to-teal-900/20" />
                            <BrandCard className="p-3 overflow-hidden">
                                <div className="relative aspect-[16/11] sm:aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <Image
                                        src={t.visuals?.heroImage?.src || "/screenshots/desktop-dashboard.png"}
                                        alt={t.visuals?.heroImage?.alt?.[locale] || "PolicyWallet dashboard preview"}
                                        fill
                                        className="object-cover"
                                        priority
                                        sizes="(min-width: 1024px) 44vw, 92vw"
                                    />
                                </div>
                            </BrandCard>
                            {t.visuals?.heroImage?.caption ? (
                                <p className="mt-3 text-xs text-[var(--brand-text-muted)] text-center">{t.visuals.heroImage.caption[locale]}</p>
                            ) : null}
                        </div>
                    </div>
                </section>

                <section id="trust-strip" className="px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
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
                            title={isGreek ? "Τρία βήματα για πλήρη εικόνα κάλυψης" : "Three steps to full coverage clarity"}
                        />
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {featureItems.map((item) => (
                                <FeatureCard key={item.title} item={item} />
                            ))}
                        </div>
                    </div>
                </section>

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
                        {t.visuals?.socialProofImages?.length ? (
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {t.visuals.socialProofImages.map((visual) => (
                                    <BrandCard key={visual.src} className="overflow-hidden">
                                        <div className="relative aspect-[4/3]">
                                            <Image src={visual.src} alt={visual.alt[locale]} fill className="object-cover" sizes="(min-width: 1024px) 25vw, 90vw" />
                                        </div>
                                    </BrandCard>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </section>

                <section id="final-cta" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-3xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <BrandSectionHeader title={conversion?.title[locale] || "Get started"} subtitle={conversion?.subtitle[locale]} align="center" />
                            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                                <BrandActionButton asChild className="flex-1" onClick={() => trackCta("final", "policyholder")}>
                                    <Link href="/auth/signup?source=landing_final_signup">
                                        {conversion?.signupLabel[locale] || "Sign up"}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild variant="secondary" className="flex-1" onClick={() => trackLandingEvent("cta_click", { location: "final", role: "invite", locale })}>
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
                            {t.faq.items.slice(0, 3).map((item) => (
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
                    <BrandActionButton asChild className="flex-1" onClick={() => trackCta("hero_primary", "policyholder")}>
                        <Link href="/auth/signup?role=policyholder&source=landing_mobile_sticky">
                            {conversion?.mobilePrimaryLabel[locale] || (isGreek ? "Ξεκίνα δωρεάν" : "Start free")}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </BrandActionButton>
                    <BrandActionButton
                        asChild
                        variant="secondary"
                        className="px-3.5"
                        aria-label={conversion?.signInLabel[locale] || (isGreek ? "Σύνδεση" : "Sign in")}
                    >
                        <Link href="/auth/signin?source=landing_mobile_sticky_signin">{conversion?.signInLabel[locale] || (isGreek ? "Σύνδεση" : "Sign in")}</Link>
                    </BrandActionButton>
                </div>
            </div>
        </div>
    )
}
