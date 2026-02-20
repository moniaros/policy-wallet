"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { ArrowRight, Bell, Brain, CheckCircle2, FileText, Lock, Shield, Users } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { BrandActionButton, BrandCard, BrandSectionHeader } from "@/components/ui/brand"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

interface WorldClassLandingProps {
    locale: LandingLocale
}

type FeatureKey = "singleSource" | "aiTranslator" | "reminders" | "secureSharing" | "familyWallet"

const featureIconMap = {
    singleSource: FileText,
    aiTranslator: Brain,
    reminders: Bell,
    secureSharing: Shield,
    familyWallet: Users,
} as const

export function WorldClassLanding({ locale }: WorldClassLandingProps) {
    const pathname = usePathname()
    const isGreek = locale === "el"
    const prefersReducedMotion = useReducedMotion()
    const [activeInsight, setActiveInsight] = useState(0)
    const t = (el: string, en: string) => (isGreek ? el : en)

    const insightMessages = [
        t("Εντοπίστηκε πιθανή διπλή οδική βοήθεια σε 2 συμβόλαια.", "Potential duplicate roadside assistance detected across 2 policies."),
        t("Η ανανέωση αυτοκινήτου λήγει σε 14 ημέρες. Ενεργοποίησε υπενθύμιση.", "Motor renewal is due in 14 days. Turn on reminders."),
        t("Το συμβόλαιο κατοικίας φαίνεται χωρίς κάλυψη πλημμύρας.", "Home policy appears to miss flood coverage."),
    ]

    const problems = [
        t("Πολλαπλά apps και portals για διαφορετικές ασφαλιστικές.", "Multiple apps and portals across insurers."),
        t("Δυσνόητα συμβόλαια και μικρά γράμματα.", "Confusing policy documents and fine print."),
        t("Χαμένες ανανεώσεις και προθεσμίες χάριτος.", "Missed renewals and grace period deadlines."),
        t("Διπλές ή περιττές καλύψεις.", "Duplicate or redundant coverages."),
    ]

    const solutions = [
        t("Ενιαία, ασφαλής προβολή όλου του χαρτοφυλακίου.", "Single, secure portfolio view."),
        t("AI που εξηγεί καλύψεις και κενά σε απλή γλώσσα.", "AI summaries of coverages and gaps in plain language."),
        t("Έξυπνες υπενθυμίσεις για ανανεώσεις και παροχές.", "Smart reminders for renewals and benefits."),
        t("Αυτόματος εντοπισμός επικαλύψεων και ελλείψεων.", "Automatic detection of overlaps and missing coverage."),
    ]

    const steps = [
        {
            title: t("1. Δημιούργησε Wallet", "1. Create your Wallet"),
            description: t("Γρήγορο sign-up τώρα, βιομετρική είσοδος στη συνέχεια.", "Quick signup now, biometric login support later."),
        },
        {
            title: t("2. Ανέβασε ή σύνδεσε συμβόλαια", "2. Upload or connect policies"),
            description: t("Ανέβασε PDF, σκάναρε έντυπα ή σύνδεσε υποστηριζόμενους συνεργάτες.", "Upload PDFs, scan paper docs, or connect supported partners."),
        },
        {
            title: t("3. Άφησε το AI να αναλύσει", "3. Let AI analyze"),
            description: t("Πάρε περίληψη καλύψεων, κενά και ευκαιρίες εξοικονόμησης.", "Get coverage summaries, gaps, and savings opportunities."),
        },
    ]

    const features: Array<{ key: FeatureKey; title: string; description: string }> = [
        {
            key: "singleSource",
            title: "Single Source of Truth",
            description: t("Όλα τα συμβόλαια και έγγραφα σε ένα σημείο.", "All policies and documents in one place."),
        },
        {
            key: "aiTranslator",
            title: "AI Fine-Print Translator",
            description: t("Κατανοητή εξήγηση καλύψεων, εξαιρέσεων και όρων.", "Clear explanations of coverages, exclusions, and clauses."),
        },
        {
            key: "reminders",
            title: "Smart Reminders",
            description: t("Υπενθυμίσεις για ανανεώσεις, πληρωμές και παροχές.", "Renewal, payment, and preventive benefit reminders."),
        },
        {
            key: "secureSharing",
            title: "Secure Sharing with Professionals",
            description: t("Συνεργασία με σύμβουλο με granular δικαιώματα πρόσβασης.", "Collaborate with your adviser using granular permissions."),
        },
        {
            key: "familyWallet",
            title: "Family Wallets",
            description: t("Ελεγχόμενη κοινή πρόσβαση για βασικά μέλη οικογένειας.", "Shared access for key family members with control."),
        },
    ]

    const testimonials = [
        {
            quote: t(
                "Βρήκα παροχές που είχα ξεχάσει και έκλεισα κενό στην κατοικία μέσα σε μία μέρα.",
                "I found forgotten benefits and fixed a home coverage gap in one day."
            ),
            author: "Policyholder, 42",
        },
        {
            quote: t(
                "Σταμάτησα να χάνω ανανεώσεις. Το wallet με ειδοποιεί έγκαιρα και οργανωμένα.",
                "I stopped missing renewals. The wallet alerts me early and clearly."
            ),
            author: "Policyholder, 36",
        },
        {
            quote: t(
                "Η επικοινωνία με τους πελάτες έγινε πιο άμεση, γιατί βλέπουμε το ίδιο dashboard.",
                "Client communication is faster because we work from the same dashboard."
            ),
            author: t("Insurance Adviser", "Insurance Adviser"),
        },
    ]

    const faqItems = [
        {
            q: t("Μπορώ να έχω συμβόλαια από διαφορετικές ασφαλιστικές;", "Can I add policies from different insurers?"),
            a: t("Ναι. Ο στόχος είναι ένα ενιαίο wallet για όλο το χαρτοφυλάκιο σου.", "Yes. The goal is one unified wallet for your full portfolio."),
        },
        {
            q: t("Χρειάζεται τεχνική γνώση για την AI ανάλυση;", "Do I need technical skills to use AI analysis?"),
            a: t("Όχι. Τα ευρήματα παρουσιάζονται σε απλή γλώσσα με πρακτικές ενέργειες.", "No. Insights are presented in plain language with practical actions."),
        },
        {
            q: t("Μπορώ να συνεργαστώ με τον ασφαλιστικό μου σύμβουλο;", "Can I collaborate with my insurance professional?"),
            a: t("Ναι, μέσω ασφαλούς κοινής πρόσβασης και ελεγχόμενων δικαιωμάτων.", "Yes, through secure sharing and granular permissions."),
        },
    ]

    const footerLinks = [
        { key: "about", label: "About", href: "#how-it-works" },
        { key: "security", label: "Security", href: "#trust-compliance" },
        { key: "faq", label: "FAQ", href: "#faq" },
        { key: "professionals", label: "For Insurance Professionals", href: "/auth/signup?role=agent&source=landing_footer_professionals" },
        { key: "contact", label: "Contact", href: "mailto:support@policywallet.app" },
        { key: "terms", label: "Terms", href: "/terms" },
        { key: "privacy", label: "Privacy", href: "/privacy" },
    ]

    useEffect(() => {
        trackLandingEvent("landing_view", { locale, path: pathname })
    }, [locale, pathname])

    useEffect(() => {
        if (insightMessages.length <= 1) return
        const intervalId = window.setInterval(() => {
            setActiveInsight((prev) => (prev + 1) % insightMessages.length)
        }, prefersReducedMotion ? 9500 : 6200)
        return () => window.clearInterval(intervalId)
    }, [insightMessages.length, prefersReducedMotion])

    const trackCta = (location: string, action: "signup_policyholder" | "signup_agent" | "signin") => {
        trackLandingEvent("cta_click", { location, action, locale })
        if (action === "signin") {
            trackLandingEvent("signin_start", { source: location, locale })
            return
        }
        trackLandingEvent("signup_start", {
            role: action === "signup_agent" ? "agent" : "policyholder",
            source: location,
            locale,
        })
    }

    return (
        <div className={`${ibmPlexSans.className} min-h-screen bg-[var(--brand-bg-canvas)] text-[var(--brand-text-primary)]`}>
            <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
                <div className="h-16 px-4 sm:px-6 flex items-center justify-between rounded-2xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/90 backdrop-blur-xl shadow-xl shadow-emerald-900/5">
                    <PolicyWalletLogo size="sm" language={locale} />
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                            <Link href="/" className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${locale === "el" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"}`}>EL</Link>
                            <Link href="/en" className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${locale === "en" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"}`}>EN</Link>
                        </div>
                        <ThemeToggle />
                        <Link href="/auth/signin?source=landing_header_signin" onClick={() => trackCta("header_signin", "signin")} className="hidden sm:block px-3 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
                            {t("Σύνδεση", "Sign in")}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 sm:pt-28 pb-20 sm:pb-0">
                <section id="hero" className="px-4 sm:px-6 lg:px-8 pb-12">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.03fr_0.97fr] gap-8 lg:gap-10 items-center">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Shield className="w-3.5 h-3.5" />
                                {t("Το ενιαίο wallet για όλη την ασφάλισή σου", "One wallet for your entire insurance life")}
                            </div>
                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--brand-text-primary)]">
                                {t("Ένα ψηφιακό insurance wallet για όλα τα συμβόλαια.", "A single digital insurance wallet for every policy.")}
                            </h1>
                            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--brand-text-muted)] max-w-xl">
                                {t("Συγκέντρωσε συμβόλαια από διαφορετικές εταιρείες, γραμμές κάλυψης και μέλη οικογένειας σε μία καθαρή εικόνα.", "Bring policies across insurers, coverage lines, and family members into one clear view.")}
                            </p>
                            <ul className="mt-4 space-y-2">
                                {[t("Όλα τα έγγραφα σε ένα ασφαλές σημείο.", "All policy documents in one secure place."), t("AI ανάλυση καλύψεων και όρων σε απλή γλώσσα.", "AI explains coverage and fine print in plain language."), t("Τέλος στα PDF χαμένα σε downloads και email.", "No more PDFs scattered in downloads and inboxes.")].map((bullet) => (
                                    <li key={bullet} className="flex items-start gap-2 text-sm text-[var(--brand-text-primary)]">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
                                <BrandActionButton asChild>
                                    <Link href="/auth/signup?role=policyholder&source=landing_hero_primary" onClick={() => trackCta("hero_primary", "signup_policyholder")}>
                                        {t("Απόκτησε το Wallet σου", "Get Your Wallet")}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild variant="secondary">
                                    <Link href="/auth/signup?role=agent&source=landing_hero_agent" onClick={() => trackCta("hero_agent", "signup_agent")}>
                                        {t("Είμαι Ασφαλιστικός Επαγγελματίας", "I'm an Insurance Professional")}
                                    </Link>
                                </BrandActionButton>
                            </div>
                            <p className="mt-3 text-xs text-[var(--brand-text-muted)]">{t("Δωρεάν έναρξη για policyholders. Συνεργασία με σύμβουλο όποτε τη χρειαστείς.", "Start free as a policyholder. Invite your adviser when you need support.")}</p>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-emerald-300/35 to-teal-200/35 blur-3xl dark:from-emerald-800/30 dark:to-teal-900/20" />
                            <BrandCard className="p-4 sm:p-5 border-[var(--brand-border-strong)]">
                                <div className="rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-elevated)] p-4 sm:p-5">
                                    <p className="text-sm font-semibold text-[var(--brand-text-primary)]">{t("Στιγμιότυπο πορτοφολιού", "Wallet snapshot")}</p>
                                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                                        {[{ label: t("Σύνολο συμβολαίων", "Total policies"), value: "7" }, { label: t("Επερχόμενες ανανεώσεις", "Upcoming renewals"), value: "2" }, { label: t("AI ευρήματα", "AI insights"), value: "4" }].map((stat) => (
                                            <div key={stat.label} className="rounded-lg border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] px-2.5 py-2">
                                                <p className="text-lg font-bold text-[var(--brand-text-primary)]">{stat.value}</p>
                                                <p className="text-[10px] leading-tight text-[var(--brand-text-muted)]">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30 px-3 py-2.5">
                                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">AI insight</p>
                                        <div className="relative mt-1 min-h-[42px]">
                                            <AnimatePresence mode="wait">
                                                <motion.p key={insightMessages[activeInsight]} initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }} transition={{ duration: prefersReducedMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 text-sm text-emerald-900 dark:text-emerald-200">{insightMessages[activeInsight]}</motion.p>
                                            </AnimatePresence>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            {insightMessages.map((insight, index) => (
                                                <button key={insight} type="button" onClick={() => setActiveInsight(index)} className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${index === activeInsight ? "w-6 bg-emerald-600" : "w-2 bg-emerald-300 dark:bg-emerald-700"}`} aria-label={`Insight ${index + 1}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {[{ type: t("Αυτοκίνητο", "Motor"), insurer: "Ethniki Insurance", renewal: t("Ανανέωση σε 14 ημέρες", "Renews in 14 days") }, { type: t("Κατοικία", "Home"), insurer: "Anytime", renewal: t("Ανανέωση σε 83 ημέρες", "Renews in 83 days") }, { type: t("Υγεία", "Health"), insurer: "Interamerican", renewal: t("Ανανέωση σε 132 ημέρες", "Renews in 132 days") }].map((policy) => (
                                            <div key={`${policy.type}-${policy.insurer}`} className="rounded-lg border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] px-3 py-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-[var(--brand-text-primary)]">{policy.type}</p>
                                                    <p className="text-[11px] text-[var(--brand-text-muted)]">{policy.insurer}</p>
                                                </div>
                                                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">{policy.renewal}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </BrandCard>
                        </div>
                    </div>
                </section>

                <section id="problem-solution" className="px-4 sm:px-6 lg:px-8 py-14 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Το πρόβλημα σήμερα και η λύση", "The problem today and the solution")} subtitle={t("Από πολλαπλές πλατφόρμες και δυσνόητα έγγραφα, σε μία έξυπνη εικόνα χαρτοφυλακίου.", "Move from fragmented portals and confusing wording to one smart portfolio view.")} />
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <BrandCard className="p-6 border-red-200/80 dark:border-red-900/40">
                                <h3 className="text-lg font-bold text-[var(--brand-text-primary)]">{t("Τι δυσκολεύει τους policyholders", "What policyholders struggle with")}</h3>
                                <ul className="mt-4 space-y-2.5">{problems.map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm text-[var(--brand-text-muted)]"><span className="mt-1 text-red-600">•</span><span>{bullet}</span></li>)}</ul>
                            </BrandCard>
                            <BrandCard className="p-6 border-emerald-200/80 dark:border-emerald-900/40">
                                <h3 className="text-lg font-bold text-[var(--brand-text-primary)]">{t("Τι αλλάζει με το PolicyWallet", "What PolicyWallet fixes")}</h3>
                                <ul className="mt-4 space-y-2.5">{solutions.map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm text-[var(--brand-text-muted)]"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" /><span>{bullet}</span></li>)}</ul>
                            </BrandCard>
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Πώς λειτουργεί σε 3 βήματα", "How it works in 3 steps")} />
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {steps.map((step, index) => (
                                <BrandCard key={step.title} className="p-5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center text-sm font-bold">{index + 1}</div>
                                    <h3 className="mt-4 text-lg font-semibold text-[var(--brand-text-primary)]">{step.title}</h3>
                                    <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{step.description}</p>
                                </BrandCard>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="features" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Δυνατότητες που ξεχωρίζουν", "Feature highlights")} />
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {features.map((feature) => {
                                const Icon = featureIconMap[feature.key]
                                return (
                                    <BrandCard key={feature.title} className="p-5">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                                        <h3 className="mt-4 text-base font-semibold text-[var(--brand-text-primary)]">{feature.title}</h3>
                                        <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{feature.description}</p>
                                    </BrandCard>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section id="trust-compliance" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center"><Lock className="w-5 h-5" /></div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-text-primary)]">Trust & Compliance by design</h2>
                                    <p className="mt-3 text-sm sm:text-base text-[var(--brand-text-muted)]">{t("Το προϊόν σχεδιάζεται για ασφάλεια, διαφάνεια και ελεγχόμενη πρόσβαση από την πρώτη ημέρα.", "Built with security, transparency, and controlled access from day one.")}</p>
                                </div>
                            </div>
                            <ul className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[t("Privacy-by-design, ελάχιστη συλλογή δεδομένων, granular access control.", "Privacy-by-design, limited data collection, and granular access control."), t("Κρυπτογράφηση, υποστήριξη βιομετρικής σύνδεσης και audit logs.", "Encryption, biometric login support, and audit logs."), t("Ευθυγράμμιση με απαιτήσεις κανονιστικής συμμόρφωσης στον ασφαλιστικό χώρο.", "Alignment with insurance governance and compliance requirements.")].map((bullet) => (
                                    <li key={bullet} className="rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-elevated)] px-4 py-3 text-sm text-[var(--brand-text-primary)]">{bullet}</li>
                                ))}
                            </ul>
                        </BrandCard>
                    </div>
                </section>

                <section id="social-proof" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Social proof & πραγματικές χρήσεις", "Social proof & real-world use cases")} />
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">{testimonials.map((item) => <BrandCard key={item.quote} className="p-6"><p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">"{item.quote}"</p><p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{item.author}</p></BrandCard>)}</div>
                    </div>
                </section>

                <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto">
                        <BrandSectionHeader title={t("Συχνές ερωτήσεις", "FAQ")} align="center" />
                        <div className="mt-6 grid grid-cols-1 gap-3">{faqItems.map((item) => <BrandCard key={item.q} className="p-5"><p className="font-semibold text-[var(--brand-text-primary)]">{item.q}</p><p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-muted)]">{item.a}</p></BrandCard>)}</div>
                    </div>
                </section>

                <section id="final-cta" className="px-4 sm:px-6 lg:px-8 pb-16">
                    <div className="max-w-3xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <BrandSectionHeader title={t("Ξεκίνα το ψηφιακό σου insurance wallet", "Start your digital insurance wallet")} subtitle={t("Οργάνωσε συμβόλαια, τρέξε AI ανάλυση και συνεργάσου με τον σύμβουλό σου.", "Organize policies, run AI analysis, and collaborate with your adviser.")} align="center" />
                            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                                <BrandActionButton asChild className="flex-1"><Link href="/auth/signup?role=policyholder&source=landing_final_policyholder" onClick={() => trackCta("final_policyholder", "signup_policyholder")}>{t("Απόκτησε το Wallet σου", "Get Your Wallet")}<ArrowRight className="w-4 h-4" /></Link></BrandActionButton>
                                <BrandActionButton asChild variant="secondary" className="flex-1"><Link href="/auth/signup?role=agent&source=landing_final_agent" onClick={() => trackCta("final_agent", "signup_agent")}>{t("Είμαι Ασφαλιστικός Επαγγελματίας", "I'm an Insurance Professional")}</Link></BrandActionButton>
                            </div>
                        </BrandCard>
                    </div>
                </section>
            </main>

            <footer id="footer-links" className="border-t border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/70 py-10 px-4 sm:px-6 lg:px-8 text-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <PolicyWalletLogo size="sm" language={locale} />
                        <span className="text-[var(--brand-text-muted)]">{t("Σύνδεσμοι", "Links")}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap gap-x-6 gap-y-3 text-[var(--brand-text-muted)]">
                        {footerLinks.map((linkItem) => (
                            <Link key={linkItem.key} href={linkItem.href} onClick={() => trackLandingEvent("footer_link_click", { locale, link: linkItem.key })} className="hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                                {linkItem.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>

            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/95 backdrop-blur-md p-3">
                <div className="mx-auto max-w-7xl grid grid-cols-[1fr_auto] gap-2">
                    <BrandActionButton asChild className="w-full" onClick={() => trackCta("mobile_primary", "signup_policyholder")}><Link href="/auth/signup?role=policyholder&source=landing_mobile_primary">{t("Απόκτησε το Wallet σου", "Get Your Wallet")}<ArrowRight className="w-4 h-4" /></Link></BrandActionButton>
                    <BrandActionButton asChild variant="secondary" className="px-3.5" onClick={() => trackCta("mobile_agent", "signup_agent")}><Link href="/auth/signup?role=agent&source=landing_mobile_agent"><Users className="w-4 h-4" /></Link></BrandActionButton>
                </div>
            </div>
        </div>
    )
}
