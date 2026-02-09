"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    FileText,
    Lock,
    MessageSquare,
    Shield,
    Users,
} from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { PolicyWalletLogo } from "@/components/branding/Logo"
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

export function WorldClassLanding({ locale, content = landingContent }: WorldClassLandingProps) {
    const pathname = usePathname()

    const isGreek = locale === "el"
    const t = content

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
        <div className={`${ibmPlexSans.className} min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100`}>
            <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
                <div className="h-16 px-4 sm:px-6 flex items-center justify-between rounded-2xl border border-sky-100/80 bg-white/90 backdrop-blur-xl shadow-xl shadow-sky-900/5 dark:border-slate-700 dark:bg-slate-900/90">
                    <PolicyWalletLogo size="sm" language={locale} />
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                            <Link
                                href="/"
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${isGreek ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-600 dark:text-slate-400"}`}
                            >
                                EL
                            </Link>
                            <Link
                                href="/en"
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${!isGreek ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-600 dark:text-slate-400"}`}
                            >
                                EN
                            </Link>
                        </div>
                        <ThemeToggle />
                        <Link href="/auth/signin" className="hidden sm:block px-3 py-2 text-sm font-semibold text-slate-700 hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300">
                            {isGreek ? "Σύνδεση" : "Sign in"}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-28 sm:pt-32">
                <section id="hero" className="px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100/80 px-3 py-1.5 text-xs font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300">
                                <Shield className="w-3.5 h-3.5" />
                                {t.hero.badge[locale]}
                            </div>
                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {t.hero.title[locale]}
                            </h1>
                            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
                                {t.hero.subtitle[locale]}
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    href="/auth/signup?role=policyholder&source=landing_hero_primary"
                                    onClick={() => trackCta("hero_primary", "policyholder")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
                                >
                                    {t.hero.primaryCta[locale]}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/auth/signin?source=landing_agent_invite"
                                    onClick={() => trackCta("hero_secondary", "invite")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    {t.hero.secondaryCta[locale]}
                                </Link>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                {isGreek
                                    ? "Πρώτη αξία σε λιγότερο από 2 λεπτά: ανεβάζετε συμβόλαιο και ξεκινά η ανάλυση."
                                    : "First value in under 2 minutes: upload your policy and AI analysis starts immediately."}
                            </p>
                            <div className="mt-3">
                                <Link
                                    href="/auth/signup?role=agent&source=landing_hero_agent"
                                    onClick={() => trackCta("agent", "agent")}
                                    className="text-sm font-semibold text-sky-700 hover:text-sky-600 dark:text-sky-300"
                                >
                                    {t.hero.tertiaryCta[locale]}
                                </Link>
                            </div>

                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                                    <div className="font-semibold text-slate-900 dark:text-white">{isGreek ? "Ουδέτερο πορτοφόλι" : "Neutral wallet"}</div>
                                    <div className="text-slate-600 dark:text-slate-300">{isGreek ? "Για όλες τις ασφαλιστικές" : "Across all insurers"}</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                                    <div className="font-semibold text-slate-900 dark:text-white">{isGreek ? "AI με έλεγχο" : "Controlled AI"}</div>
                                    <div className="text-slate-600 dark:text-slate-300">{isGreek ? "Επαλήθευση και επεξεργασία από εσάς" : "You review and edit"}</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                                    <div className="font-semibold text-slate-900 dark:text-white">{isGreek ? "Συνεργασία πράκτορα" : "Agent collaboration"}</div>
                                    <div className="text-slate-600 dark:text-slate-300">{isGreek ? "Δικαιώματα και διαφάνεια" : "Permissioned and transparent"}</div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-sky-400/25 to-cyan-200/25 blur-3xl dark:from-sky-800/30 dark:to-cyan-900/20" />
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <Image src="/screenshots/desktop-dashboard.png" alt="PolicyWallet dashboard preview" fill className="object-cover" priority />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="personas" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
                        {t.personaTracks.map((track) => (
                            <article key={track.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                                <h2 className="text-xl font-bold">{track.title[locale]}</h2>
                                <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                    {track.bullets.map((bullet, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                                            <span>{bullet[locale]}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={track.ctaHref}
                                    onClick={() => {
                                        trackLandingEvent("persona_card_click", { persona: track.id, locale })
                                        trackLandingEvent("signup_start", { role: track.id, source: `landing_persona_${track.id}`, locale })
                                    }}
                                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-white hover:bg-sky-700"
                                >
                                    {track.ctaLabel[locale]}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.howItWorks.title[locale]}</h2>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {t.howItWorks.steps.map((step) => (
                                <article key={step.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                                    <h3 className="font-semibold">{step.title[locale]}</h3>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.description[locale]}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="ai-extraction" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.aiExtraction.title[locale]}</h2>
                        <p className="mt-3 text-slate-600 dark:text-slate-300">{t.aiExtraction.subtitle[locale]}</p>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {t.aiExtraction.fields.map((field, idx) => (
                                <div key={idx} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                                    <FileText className="w-4 h-4 mb-2 text-sky-600" />
                                    {field[locale]}
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t.aiExtraction.reviewNote[locale]}</p>
                    </div>
                </section>

                <section id="collaboration" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.collaboration.title[locale]}</h2>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {t.collaboration.tracks.map((track) => (
                                <article key={track.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                                    <h3 className="text-lg font-semibold">{track.title[locale]}</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                        {track.points.map((point, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <Users className="w-4 h-4 mt-0.5 text-sky-600" />
                                                <span>{point[locale]}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="qa-upgrade" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.qaUpgrade.title[locale]}</h2>
                        <p className="mt-3 text-slate-600 dark:text-slate-300">{t.qaUpgrade.subtitle[locale]}</p>
                        <ul className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            {t.qaUpgrade.bullets.map((bullet, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <MessageSquare className="w-4 h-4 mt-0.5 text-orange-500" />
                                    <span>{bullet[locale]}</span>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/pricing"
                            onClick={() => trackLandingEvent("pricing_click", { locale })}
                            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 font-semibold text-white hover:bg-orange-600"
                        >
                            {t.qaUpgrade.pricingCta[locale]}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                <section id="trust" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.trust.title[locale]}</h2>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {t.trust.bullets.map((bullet, idx) => (
                                <article key={idx} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 text-sm">
                                    {bullet[locale]}
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="security" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.security.title[locale]}</h2>
                        <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {t.security.bullets.map((bullet, idx) => (
                                <li key={idx} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 text-sm flex items-start gap-2">
                                    <Lock className="w-4 h-4 mt-0.5 text-emerald-600" />
                                    <span>{bullet[locale]}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center">{t.faq.title[locale]}</h2>
                        <div className="mt-8 space-y-3">
                            {t.faq.items.map((item) => (
                                <details
                                    key={item.id}
                                    className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                    onToggle={(e) => {
                                        if ((e.currentTarget as HTMLDetailsElement).open) {
                                            trackLandingEvent("faq_expand", { faq_id: item.id, locale })
                                        }
                                    }}
                                >
                                    <summary className="list-none cursor-pointer flex items-center justify-between p-5">
                                        <span className="font-semibold">{item.question[locale]}</span>
                                        <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-5 pb-5 text-sm leading-relaxed text-slate-600 border-t border-slate-100 dark:text-slate-300 dark:border-slate-800">
                                        {item.answer[locale]}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="final-cta" className="px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t.finalCta.title[locale]}</h2>
                        <p className="mt-3 text-slate-600 dark:text-slate-300">{t.finalCta.subtitle[locale]}</p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href="/auth/signup?role=policyholder&source=landing_final_policyholder"
                                onClick={() => trackCta("final", "policyholder")}
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
                            >
                                {t.finalCta.policyholderCta[locale]}
                            </Link>
                            <Link
                                href="/auth/signup?role=agent&source=landing_final_agent"
                                onClick={() => trackCta("final", "agent")}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                {t.finalCta.agentCta[locale]}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="footer-links" className="border-t border-slate-200 bg-white/70 py-10 px-4 sm:px-6 lg:px-8 text-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <PolicyWalletLogo size="sm" language={locale} />
                        <span className="text-slate-500 dark:text-slate-400">{t.footer.linksLabel[locale]}</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-600 dark:text-slate-300">
                        <Link href="/pricing" onClick={() => trackLandingEvent("pricing_click", { locale })} className="hover:text-sky-700 dark:hover:text-sky-300">Pricing</Link>
                        <Link href="/privacy" className="hover:text-sky-700 dark:hover:text-sky-300">Privacy</Link>
                        <Link href="/terms" className="hover:text-sky-700 dark:hover:text-sky-300">Terms</Link>
                        <Link href="/auth/signin?next=/help" className="hover:text-sky-700 dark:hover:text-sky-300">{t.footer.helpLabel[locale]}</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
