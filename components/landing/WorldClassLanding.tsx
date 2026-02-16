"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import {
    ArrowRight,
    Bell,
    Brain,
    FileText,
    Lock,
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

    const trustItems = [
        {
            title: isGreek ? "Ασφάλεια τραπεζικού επιπέδου" : "Bank-level security",
            subtitle: isGreek ? "Κρυπτογραφημένη αποθήκευση και αυστηρή προστασία δεδομένων." : "Encrypted storage and strict data protection.",
            icon: Lock,
        },
        {
            title: isGreek ? "Ουδέτερη πλατφόρμα" : "Neutral platform",
            subtitle: isGreek ? "Ανεξάρτητη από σχεδιασμό, με επίκεντρο τα συμφέροντά σας." : "Independent by design, aligned with your interests.",
            icon: Shield,
        },
        {
            title: isGreek ? "Συνεργάζεται με μεγάλες ασφαλιστικές" : "Works across major insurers",
            subtitle: isGreek ? "Συγκεντρώστε συμβόλαια από διαφορετικές ασφαλιστικές σε ένα πορτοφόλι." : "Bring policies from different insurers into one wallet.",
            icon: Users,
        },
    ]

    const featureItems = [
        {
            title: isGreek ? "Ανέβασμα συμβολαίων" : "Upload policies",
            subtitle: isGreek ? "Ανεβάζετε PDF ή φωτογραφία με καθαρή καταχώρηση στοιχείων." : "PDF or photo upload with clean policy capture.",
            icon: FileText,
        },
        {
            title: isGreek ? "Το AI εντοπίζει κενά κάλυψης" : "AI finds coverage gaps",
            subtitle: isGreek ? "Εντοπίζετε ελλείψεις πριν μετατραπούν σε υψηλό κόστος." : "Spot missing coverage before it becomes expensive.",
            icon: Brain,
        },
        {
            title: isGreek ? "Έξυπνες υπενθυμίσεις" : "Smart reminders",
            subtitle: isGreek ? "Υπενθυμίσεις για ανανεώσεις και προθεσμίες όταν πραγματικά χρειάζονται." : "Renewal and deadline reminders when they matter.",
            icon: Bell,
        },
    ]

    const testimonials = [
        {
            quote: isGreek
                ? "Μέσα σε λίγα λεπτά είχα τα βασικά συμβόλαιά μου οργανωμένα και εύκολα κατανοητά."
                : "In minutes, I had my core policies organized and easy to understand.",
            author: "Maria K.",
        },
        {
            quote: isGreek
                ? "Η συνεργασία με τους πελάτες έγινε πιο γρήγορη και πολύ πιο διαφανής."
                : "Client collaboration became faster and much more transparent.",
            author: "Nikos P.",
        },
    ]

    return (
        <div className={`${ibmPlexSans.className} min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 dark:text-slate-100`}>
            <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
                <div className="h-16 px-4 sm:px-6 flex items-center justify-between rounded-2xl border border-emerald-100/80 bg-white/90 backdrop-blur-xl shadow-xl shadow-emerald-900/5 dark:border-slate-700 dark:bg-slate-900/90">
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
                        <Link href="/auth/signin" className="sm:hidden px-2.5 py-1 text-xs font-bold rounded-md text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300">
                            {isGreek ? "Σύνδεση" : "Sign in"}
                        </Link>
                        <Link href="/auth/signin" className="hidden sm:block px-3 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
                            {isGreek ? "Σύνδεση" : "Sign in"}
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
                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {t.hero.title[locale]}
                            </h1>
                            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
                                {t.hero.subtitle[locale]}
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl">
                                <Link
                                    href="/auth/signup?role=policyholder&source=landing_hero_primary"
                                    onClick={() => trackCta("hero_primary", "policyholder")}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white hover:bg-orange-600 text-center"
                                >
                                    {t.hero.primaryCta[locale]}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/auth/signin?source=landing_agent_invite"
                                    onClick={() => trackCta("hero_secondary", "invite")}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3.5 font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 text-center"
                                >
                                    {t.hero.secondaryCta[locale]}
                                </Link>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                {isGreek
                                    ? "Πρώτη αξία σε λιγότερο από 2 λεπτά: ανεβάζετε το συμβόλαιο και η ανάλυση AI ξεκινά άμεσα."
                                    : "First value in under 2 minutes: upload your policy and AI analysis starts immediately."}
                            </p>
                            <div className="mt-3 hidden sm:block">
                                <Link
                                    href="/auth/signup?role=agent&source=landing_hero_agent"
                                    onClick={() => trackCta("agent", "agent")}
                                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300"
                                >
                                    {t.hero.tertiaryCta[locale]}
                                </Link>
                            </div>
                            <div className="mt-3 sm:hidden">
                                <Link
                                    href="/auth/signup?role=agent&source=landing_hero_agent_mobile"
                                    onClick={() => trackCta("agent", "agent")}
                                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300"
                                >
                                    {t.hero.tertiaryCta[locale]}
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-emerald-300/30 to-teal-200/30 blur-3xl dark:from-emerald-800/30 dark:to-teal-900/20" />
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                                <div className="relative aspect-[16/11] sm:aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <Image src="/screenshots/desktop-dashboard.png" alt="PolicyWallet dashboard preview" fill className="object-cover" priority />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="trust-strip" className="px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {trustItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <article key={item.title} className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                                <p className="mt-1 text-slate-600 dark:text-slate-300">{item.subtitle}</p>
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section id="core-features" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold">
                            {isGreek ? "Τρία βήματα για πλήρη εικόνα κάλυψης" : "Three steps to full coverage clarity"}
                        </h2>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {featureItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section id="social-proof" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                                <h2 className="text-2xl sm:text-3xl font-bold">{isGreek ? "Εμπιστοσύνη στην πράξη" : "Trust in practice"}</h2>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-3xl font-bold text-slate-900 dark:text-white">10k+</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{isGreek ? "ενεργοί χρήστες" : "active users"}</p>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-slate-900 dark:text-white">50k+</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{isGreek ? "συμβόλαια" : "policies"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {testimonials.map((item) => (
                                    <article key={item.author} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                                        <p className="text-slate-700 dark:text-slate-200">"{item.quote}"</p>
                                        <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{item.author}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="final-cta" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-3xl mx-auto">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-700 dark:bg-slate-900">
                            <h2 className="text-3xl sm:text-4xl font-bold text-center">{isGreek ? "Ξεκινήστε τώρα" : "Get started now"}</h2>
                            <p className="mt-3 text-center text-slate-600 dark:text-slate-300">
                                {isGreek ? "Δημιουργήστε λογαριασμό ή συνεχίστε στο πορτοφόλι σας." : "Create your account or continue to your wallet."}
                            </p>
                            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                                <Link
                                    href="/auth/signup?source=landing_final_signup"
                                    onClick={() => trackCta("final", "policyholder")}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer"
                                >
                                    {isGreek ? "Εγγραφή" : "Sign up"}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/auth/signin?source=landing_final_login"
                                    onClick={() => trackLandingEvent("cta_click", { location: "final", role: "invite", locale })}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    {isGreek ? "Σύνδεση" : "Login"}
                                </Link>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                                {isGreek ? "Ασφαλής πρόσβαση, χωρίς περιττά βήματα." : "Secure access. No unnecessary steps."}
                            </p>
                        </div>
                    </div>
                </section>

                <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center">{t.faq.title[locale]}</h2>
                        <div className="mt-6 grid grid-cols-1 gap-3">
                            {t.faq.items.slice(0, 3).map((item) => (
                                <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                                    <p className="font-semibold">{item.question[locale]}</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.answer[locale]}</p>
                                </article>
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

            <footer id="footer-links" className="border-t border-slate-200 bg-white/70 py-10 px-4 sm:px-6 lg:px-8 text-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <PolicyWalletLogo size="sm" language={locale} />
                        <span className="text-slate-500 dark:text-slate-400">{t.footer.linksLabel[locale]}</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-600 dark:text-slate-300">
                        <Link href="/pricing" onClick={() => trackLandingEvent("pricing_click", { locale })} className="hover:text-emerald-700 dark:hover:text-emerald-300">Pricing</Link>
                        <Link href="/privacy" className="hover:text-emerald-700 dark:hover:text-emerald-300">Privacy</Link>
                        <Link href="/terms" className="hover:text-emerald-700 dark:hover:text-emerald-300">Terms</Link>
                        <Link href="/auth/signin?next=/help" className="hover:text-emerald-700 dark:hover:text-emerald-300">{t.footer.helpLabel[locale]}</Link>
                    </div>
                </div>
            </footer>
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95 backdrop-blur-md p-3">
                <div className="mx-auto max-w-7xl flex items-center gap-2">
                    <Link
                        href="/auth/signup?role=policyholder&source=landing_mobile_sticky"
                        onClick={() => trackCta("hero_primary", "policyholder")}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600"
                    >
                        {isGreek ? "Ξεκίνα δωρεάν" : "Start free"}
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/auth/signin?source=landing_mobile_sticky_signin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3.5 py-3 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                        aria-label={isGreek ? "Σύνδεση" : "Sign in"}
                    >
                        {isGreek ? "Σύνδεση" : "Sign in"}
                    </Link>
                </div>
            </div>
        </div>
    )
}
