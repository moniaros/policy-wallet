"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
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

type DeviceType = "mobile" | "tablet" | "desktop"
type ReferrerSource = "organic" | "facebook" | "tech_blog" | "direct" | "email" | "partner"
type IntentType = "save_money" | "organize_policies" | "health_coverage" | "avoid_missed_renewals"
type HeroVariant = "a" | "b" | "c"
type CtaVariant = "a" | "b" | "c"
type SocialVariant = "carousel" | "static"
type FeatureKey = "singleSource" | "aiTranslator" | "reminders" | "secureSharing" | "familyWallet"

interface WorldClassLandingProps {
    locale: LandingLocale
}

const featureIconMap: Record<FeatureKey, React.ComponentType<{ className?: string }>> = {
    singleSource: FileText,
    aiTranslator: Brain,
    reminders: Bell,
    secureSharing: Shield,
    familyWallet: Users,
}

function detectDeviceType(width: number): DeviceType {
    if (width < 768) return "mobile"
    if (width < 1024) return "tablet"
    return "desktop"
}

function detectReferrerSource(utmSource: string | null, referrer: string): ReferrerSource {
    const normalizedUtm = (utmSource || "").toLowerCase()
    const normalizedReferrer = referrer.toLowerCase()

    if (normalizedUtm.includes("facebook") || normalizedReferrer.includes("facebook") || normalizedReferrer.includes("instagram")) {
        return "facebook"
    }
    if (normalizedUtm.includes("tech") || normalizedReferrer.includes("techcrunch") || normalizedReferrer.includes("producthunt")) {
        return "tech_blog"
    }
    if (normalizedUtm.includes("email") || normalizedReferrer.includes("mail")) {
        return "email"
    }
    if (normalizedUtm.includes("partner") || normalizedReferrer.includes("partner")) {
        return "partner"
    }
    if (normalizedReferrer.length > 0) {
        return "organic"
    }
    return "direct"
}

function safeVariant<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
    if (!value) return fallback
    return (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function WorldClassLanding({ locale }: WorldClassLandingProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const prefersReducedMotion = useReducedMotion()
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const [referrerSource, setReferrerSource] = useState<ReferrerSource>("direct")
    const [deviceType, setDeviceType] = useState<DeviceType>("desktop")
    const [selectedIntent, setSelectedIntent] = useState<IntentType | null>(null)
    const [heroVariant, setHeroVariant] = useState<HeroVariant>("a")
    const [ctaVariant, setCtaVariant] = useState<CtaVariant>("a")
    const [socialVariant, setSocialVariant] = useState<SocialVariant>("static")
    const [isReturningVisitor, setIsReturningVisitor] = useState(false)
    const [hasPrimaryCtaInteracted, setHasPrimaryCtaInteracted] = useState(false)
    const [activeInsight, setActiveInsight] = useState(0)
    const [activeTestimonial, setActiveTestimonial] = useState(0)
    const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0)
    const [showExitIntent, setShowExitIntent] = useState(false)
    const [waitlistEmail, setWaitlistEmail] = useState("")
    const [waitlistProfileType, setWaitlistProfileType] = useState("individual")
    const [waitlistIntent, setWaitlistIntent] = useState<IntentType | "">("")
    const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)

    const startTimeRef = useRef<number>(Date.now())
    const scroll50TrackedRef = useRef(false)
    const exitIntentTrackedRef = useRef(false)
    const sourceRef = useRef<ReferrerSource>("direct")
    const deviceRef = useRef<DeviceType>("desktop")
    const intentRef = useRef<IntentType | null>(null)
    const primaryCtaRef = useRef(false)

    useEffect(() => {
        sourceRef.current = referrerSource
    }, [referrerSource])

    useEffect(() => {
        deviceRef.current = deviceType
    }, [deviceType])

    useEffect(() => {
        intentRef.current = selectedIntent
    }, [selectedIntent])

    useEffect(() => {
        primaryCtaRef.current = hasPrimaryCtaInteracted
    }, [hasPrimaryCtaInteracted])

    const getEventBaseProps = (overrides?: Record<string, string | number | boolean | null>) => ({
        referrer_source: sourceRef.current,
        device_type: deviceRef.current,
        user_intent_selected: intentRef.current,
        time_on_page: Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)),
        primary_cta_interacted: primaryCtaRef.current,
        locale,
        ...overrides,
    })

    const trackWithSchema = (eventName: string, overrides?: Record<string, string | number | boolean | null>) => {
        trackLandingEvent(eventName, getEventBaseProps(overrides))
    }

    const insightMessages = [
        t("Εντοπίστηκε πιθανή διπλή οδική βοήθεια σε 2 συμβόλαια.", "Potential duplicate roadside assistance detected across 2 policies."),
        t("Η ανανέωση αυτοκινήτου λήγει σε 14 ημέρες. Ενεργοποίησε υπενθύμιση.", "Motor renewal is due in 14 days. Turn on reminders."),
        t("Το συμβόλαιο κατοικίας φαίνεται χωρίς κάλυψη πλημμύρας.", "Home policy appears to miss flood coverage."),
    ]

    const testimonials = [
        {
            quote: t("Βρήκα παροχές που είχα ξεχάσει και έκλεισα κενό στην κατοικία μέσα σε μία μέρα.", "I found forgotten benefits and fixed a home coverage gap in one day."),
            author: "Policyholder, 42",
        },
        {
            quote: t("Σταμάτησα να χάνω ανανεώσεις. Το wallet με ειδοποιεί έγκαιρα και οργανωμένα.", "I stopped missing renewals. The wallet alerts me early and clearly."),
            author: "Policyholder, 36",
        },
        {
            quote: t("Η επικοινωνία με τους πελάτες έγινε πιο άμεση, γιατί βλέπουμε το ίδιο dashboard.", "Client communication is faster because we work from the same dashboard."),
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

    useEffect(() => {
        startTimeRef.current = Date.now()

        const nextDeviceType = detectDeviceType(window.innerWidth)
        const nextSource = detectReferrerSource(searchParams.get("utm_source"), document.referrer)
        const seenBefore = localStorage.getItem("landing_seen") === "1"
        const qsHero = safeVariant<HeroVariant>(searchParams.get("ab_hero"), ["a", "b", "c"], "a")
        const qsCta = safeVariant<CtaVariant>(searchParams.get("ab_cta"), ["a", "b", "c"], "a")
        const qsSocial = safeVariant<SocialVariant>(searchParams.get("ab_social"), ["carousel", "static"], "static")

        setDeviceType(nextDeviceType)
        setReferrerSource(nextSource)
        setIsReturningVisitor(seenBefore)
        setHeroVariant(qsHero)
        setCtaVariant(qsCta)
        setSocialVariant(qsSocial)
        localStorage.setItem("landing_seen", "1")

        sourceRef.current = nextSource
        deviceRef.current = nextDeviceType
        trackLandingEvent("page_view_landing", {
            referrer_source: nextSource,
            device_type: nextDeviceType,
            user_intent_selected: null,
            time_on_page: 0,
            primary_cta_interacted: false,
            locale,
            path: pathname,
            ab_variant: `hero_${qsHero}|cta_${qsCta}|social_${qsSocial}`,
            returning_visitor: seenBefore,
        })
    }, [locale, pathname, searchParams])

    useEffect(() => {
        const onScroll = () => {
            if (scroll50TrackedRef.current) return
            const doc = document.documentElement
            const depth = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1)
            if (depth >= 0.5) {
                scroll50TrackedRef.current = true
                trackWithSchema("scroll_depth_50", { scroll_depth: 50 })
            }
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    useEffect(() => {
        const onMouseOut = (event: MouseEvent) => {
            if (deviceRef.current !== "desktop") return
            if (exitIntentTrackedRef.current || primaryCtaRef.current || waitlistSubmitted) return
            if (event.clientY > 0) return
            if (Date.now() - startTimeRef.current < 20000) return

            exitIntentTrackedRef.current = true
            setShowExitIntent(true)
            trackWithSchema("exit_intent_triggered", { trigger: "mouseleave_top" })
        }

        document.addEventListener("mouseout", onMouseOut)
        return () => document.removeEventListener("mouseout", onMouseOut)
    }, [waitlistSubmitted])
    useEffect(() => {
        if (prefersReducedMotion || socialVariant !== "carousel" || testimonials.length <= 1) return
        const id = window.setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
        }, 6200)
        return () => window.clearInterval(id)
    }, [prefersReducedMotion, socialVariant, testimonials.length])

    useEffect(() => {
        if (prefersReducedMotion || insightMessages.length <= 1) return
        const id = window.setInterval(() => {
            setActiveInsight((prev) => (prev + 1) % insightMessages.length)
        }, 6800)
        return () => window.clearInterval(id)
    }, [prefersReducedMotion, insightMessages.length])

    const heroHeadline = useMemo(() => {
        if (heroVariant === "b") return t("Ένα ψηφιακό wallet για όλα τα ασφαλιστικά σου συμβόλαια.", "A single digital insurance wallet for every policy.")
        if (heroVariant === "c") return t("Σταμάτα να ψάχνεις συμβόλαια σε email, portals και apps.", "Stop searching for policies across emails, portals, and apps.")
        return t("Η ασφάλιση σου. Ένα Wallet. Οργανωμένα.", "Your insurance. One wallet. Zero confusion.")
    }, [heroVariant])

    const heroPrimaryLabel = useMemo(() => {
        if (ctaVariant === "b") return t("Δημιούργησε το Wallet μου", "Create My Wallet")
        if (ctaVariant === "c") return t("Ξεκίνα δωρεάν Wallet", "Start Free Wallet")
        return t("Απόκτησε το Wallet σου", "Get Your Wallet")
    }, [ctaVariant])

    const heroSubtitle = useMemo(() => {
        if (referrerSource === "facebook") return t("Επιτέλους οργάνωσε την ασφάλισή σου σε ΕΝΑ σημείο.", "Finally organize your insurance in ONE place.")
        if (referrerSource === "organic") return t("Ψηφιακό wallet για όλα τα ασφαλιστικά συμβόλαιά σου.", "Digital insurance wallet for all your policies.")
        if (referrerSource === "tech_blog") return t("AI που διαβάζει πολυσέλιδα συμβόλαια σε δευτερόλεπτα και σου εξηγεί τα κρίσιμα σημεία.", "AI reads long policy PDFs in seconds and explains what matters.")
        return t("Συγκέντρωσε συμβόλαια από διαφορετικές εταιρείες, καλύψεις, δικαιούχους και καλυπτόμενα μέλη σε μία καθαρή εικόνα.", "Bring policies across insurers, coverage lines, and family members into one clear view.")
    }, [referrerSource])

    const handleIntentSelect = (intent: IntentType) => {
        setSelectedIntent(intent)
        trackWithSchema("intent_selected", { user_intent_selected: intent })
    }

    const handlePrimaryCtaClick = (location: "hero" | "final" | "mobile") => {
        setHasPrimaryCtaInteracted(true)
        const eventName = location === "hero" ? "cta_clicked_hero" : "cta_clicked_final"
        trackWithSchema(eventName, { location, cta_role: "policyholder" })
    }

    const handleAgentCtaClick = (location: string) => {
        trackWithSchema("cta_clicked_hero", { location, cta_role: "agent" })
    }

    const handleDemoStart = (location: string) => {
        trackWithSchema("demo_started", { location })
    }

    const handleWaitlistSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const email = waitlistEmail.trim()
        if (!email || !email.includes("@")) return

        trackWithSchema("form_submitted_waitlist", {
            email_domain: email.split("@")[1] || "",
            profile_type: waitlistProfileType,
            waitlist_intent: waitlistIntent || null,
        })
        setWaitlistSubmitted(true)
        setShowExitIntent(false)
        setWaitlistEmail("")
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
                        <Link href="/auth/signin?source=landing_header_signin" onClick={() => trackWithSchema("cta_clicked_hero", { location: "header_signin", cta_role: "signin" })} className="hidden sm:block px-3 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
                            {t("Σύνδεση", "Sign in")}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 sm:pt-28 pb-20 sm:pb-0">
                {isReturningVisitor ? (
                    <section className="px-4 sm:px-6 lg:px-8 pb-3">
                        <div className="max-w-7xl mx-auto rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5">
                            <p className="text-sm font-medium text-emerald-800">{t("Επέστρεψες - ολοκλήρωσε τη δημιουργία του wallet σου.", "You explored before - finish creating your wallet.")}</p>
                            <div className="mt-2 h-1.5 rounded-full bg-emerald-200">
                                <div className="h-full w-2/3 rounded-full bg-emerald-600" />
                            </div>
                        </div>
                    </section>
                ) : null}

                <section id="hero" className="px-4 sm:px-6 lg:px-8 pb-12">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.03fr_0.97fr] gap-8 lg:gap-10 items-center">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Shield className="w-3.5 h-3.5" />
                                {t("Το ενιαίο wallet για όλη την ασφάλισή σου", "One wallet for your entire insurance life")}
                            </div>
                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--brand-text-primary)]">{heroHeadline}</h1>
                            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--brand-text-muted)] max-w-xl">{heroSubtitle}</p>
                            <ul className="mt-4 space-y-2">
                                {[t("Όλα τα ασφαλιστικά σου έγγραφα σε ένα ασφαλές σημείο.", "All policy documents in one secure place."), t("AI ανάλυση καλύψεων και όρων σε απλή γλώσσα.", "AI explains coverage and fine print in plain language."), t("Τέλος η αναζήτηση PDF σε φακέλους και emails.", "No more PDFs scattered in downloads and inboxes.")].map((bullet) => (
                                    <li key={bullet} className="flex items-start gap-2 text-sm text-[var(--brand-text-primary)]">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
                                <BrandActionButton asChild>
                                    <Link href="/auth/signup?role=policyholder&source=landing_hero_primary" onClick={() => handlePrimaryCtaClick("hero")}>
                                        {heroPrimaryLabel}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild variant="secondary">
                                    <Link href="/auth/signup?role=agent&source=landing_hero_agent" onClick={() => handleAgentCtaClick("hero_agent")}>
                                        {t("Είμαι Ασφαλιστικός Επαγγελματίας", "I'm an Insurance Professional")}
                                    </Link>
                                </BrandActionButton>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-[var(--brand-text-muted)]">
                                <span>{t("Δωρεάν έναρξη. Χωρίς κρυφά κόστη.", "Start free. No card required.")}</span>
                                <Link href="/dashboard-demo?source=landing_hero_demo" onClick={() => handleDemoStart("hero")} className="font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300">
                                    {t("Δες αποτελέσματα σε 60''", "Watch 60-sec demo")}
                                </Link>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {[
                                    { id: "organize_policies", label: t("Οργάνωση συμβολαίων", "Organize policies") },
                                    { id: "save_money", label: t("Μείωση κόστους", "Save money") },
                                    { id: "health_coverage", label: t("Κατανόηση καλύψεων", "Understand coverage") },
                                    { id: "avoid_missed_renewals", label: t("Ειδοποιήσεις για σημαντικά θέματα", "Avoid missed renewals") },
                                ].map((intent) => (
                                    <button
                                        key={intent.id}
                                        type="button"
                                        onClick={() => handleIntentSelect(intent.id as IntentType)}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selectedIntent === intent.id ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "border-[var(--brand-border-subtle)] text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-elevated)]"}`}
                                    >
                                        {intent.label}
                                    </button>
                                ))}
                            </div>
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
                                                <motion.p
                                                    key={insightMessages[activeInsight]}
                                                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                                                    transition={{ duration: prefersReducedMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                                                    className="absolute inset-0 text-sm text-emerald-900 dark:text-emerald-200"
                                                >
                                                    {insightMessages[activeInsight]}
                                                </motion.p>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </BrandCard>
                        </div>
                    </div>
                </section>
                <section id="problem-solution" className="px-4 sm:px-6 lg:px-8 py-14 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Η αξία που φέρνει το PolicyWallet", "The problem today and the solution")} subtitle={t("Από πολλαπλές πλατφόρμες και δυσνόητα έγγραφα, σε μία έξυπνη εικόνα χαρτοφυλακίου.", "Move from fragmented portals and confusing wording to one smart portfolio view.")} />
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <BrandCard className="p-6 border-red-200/80 dark:border-red-900/40">
                                <h3 className="text-lg font-bold text-[var(--brand-text-primary)]">{t("Τι δυσκολεύει τους policyholders", "What policyholders struggle with")}</h3>
                                <ul className="mt-4 space-y-2.5">{[t("Πολλαπλά apps και portals για διαφορετικές ασφαλιστικές.", "Multiple apps and portals across insurers."), t("Δυσνόητα συμβόλαια και μικρά γράμματα.", "Confusing policy documents and fine print."), t("Χαμένες ανανεώσεις και προθεσμίες χάριτος.", "Missed renewals and grace period deadlines."), t("Διπλές ή περιττές καλύψεις.", "Duplicate or redundant coverages.")].map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm text-[var(--brand-text-muted)]"><span className="mt-1 text-red-600">•</span><span>{bullet}</span></li>)}</ul>
                            </BrandCard>
                            <BrandCard className="p-6 border-emerald-200/80 dark:border-emerald-900/40">
                                <h3 className="text-lg font-bold text-[var(--brand-text-primary)]">{t("Τι αλλάζει με το PolicyWallet", "What PolicyWallet fixes")}</h3>
                                <ul className="mt-4 space-y-2.5">{[t("Ενιαία, ασφαλής προβολή όλου του χαρτοφυλακίου.", "Single, secure portfolio view."), t("AI που εξηγεί καλύψεις και κενά σε απλή γλώσσα.", "AI summaries of coverages and gaps in plain language."), t("Έξυπνες υπενθυμίσεις για ανανεώσεις και παροχές.", "Smart reminders for renewals and benefits."), t("Αυτόματος εντοπισμός επικαλύψεων και ελλείψεων.", "Automatic detection of overlaps and missing coverage.")].map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm text-[var(--brand-text-muted)]"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" /><span>{bullet}</span></li>)}</ul>
                            </BrandCard>
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Πώς λειτουργεί σε 3 βήματα", "How it works in 3 steps")} />
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[{ title: t("Δημιούργησε Wallet", "Create your Wallet"), description: t("Γρήγορο sign-up τώρα, βιομετρική είσοδος στη συνέχεια.", "Quick signup now, biometric login support later.") }, { title: t("Ανέβασε ή σύνδεσε συμβόλαια", "Upload or connect policies"), description: t("Ανέβασε PDF, σκάναρε έντυπα ή σύνδεσε υποστηριζόμενους συνεργάτες.", "Upload PDFs, scan paper docs, or connect supported partners.") }, { title: t("AI ανάλυση συμβολαίου", "Let AI analyze"), description: t("Σε 60'' έχεις πλήρη ανάλυση του συμβολαίου, εντοπισμένα ασφαλιστικά κενά και ευκαιρίες εξοικονόμησης.", "Get coverage summaries, gaps, and savings opportunities.") }].map((step, index) => (
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
                            {[{ key: "singleSource", title: "Single Source of Truth", description: t("Όλα τα συμβόλαια και έγγραφα σε ένα σημείο.", "All policies and documents in one place.") }, { key: "aiTranslator", title: "AI Fine-Print Translator", description: t("Κατανοητή εξήγηση καλύψεων, εξαιρέσεων και όρων.", "Clear explanations of coverages, exclusions, and clauses.") }, { key: "reminders", title: "Smart Reminders", description: t("Υπενθυμίσεις για ανανεώσεις, πληρωμές και παροχές.", "Renewal, payment, and preventive benefit reminders.") }, { key: "secureSharing", title: "Secure Sharing with Professionals", description: t("Συνεργασία με σύμβουλο με ελεγχόμενα δικαιώματα πρόσβασης.", "Collaborate with your adviser using granular permissions.") }, { key: "familyWallet", title: "Family Wallets", description: t("Ελεγχόμενη κοινή πρόσβαση για βασικά μέλη οικογένειας.", "Shared access for key family members with control.") }].map((feature) => {
                                const Icon = featureIconMap[feature.key as FeatureKey]
                                return <BrandCard key={feature.title} className="p-5"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center"><Icon className="w-5 h-5" /></div><h3 className="mt-4 text-base font-semibold text-[var(--brand-text-primary)]">{feature.title}</h3><p className="mt-2 text-sm text-[var(--brand-text-muted)]">{feature.description}</p></BrandCard>
                            })}
                        </div>
                    </div>
                </section>

                <section id="social-proof" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <BrandSectionHeader title={t("Social proof & πραγματικές χρήσεις", "Social proof & real-world use cases")} />
                        {socialVariant === "carousel" ? (
                            <BrandCard className="mt-8 p-6">
                                <p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">"{testimonials[activeTestimonial].quote}"</p>
                                <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{testimonials[activeTestimonial].author}</p>
                                <div className="mt-4 flex items-center gap-2">
                                    {testimonials.map((item, index) => (
                                        <button key={item.author} type="button" onClick={() => setActiveTestimonial(index)} className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${index === activeTestimonial ? "w-6 bg-emerald-600" : "w-2 bg-slate-300 dark:bg-slate-600"}`} aria-label={`${t("Μαρτυρία", "Testimonial")} ${index + 1}`} />
                                    ))}
                                </div>
                            </BrandCard>
                        ) : (
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">{testimonials.map((item) => <BrandCard key={item.quote} className="p-6"><p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">"{item.quote}"</p><p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{item.author}</p></BrandCard>)}</div>
                        )}
                    </div>
                </section>

                <section id="trust-compliance" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-7xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center"><Lock className="w-5 h-5" /></div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-text-primary)]">{t("Trust & Compliance by design", "Trust & Compliance by design")}</h2>
                                    <p className="mt-3 text-sm sm:text-base text-[var(--brand-text-muted)]">{t("Privacy-by-design, ελάχιστη συλλογή δεδομένων, granular access control, κρυπτογράφηση, βιομετρική σύνδεση και audit logs.", "Privacy-by-design, limited data collection, granular access controls, encryption, biometric login support, and audit logs.")}</p>
                                </div>
                            </div>
                        </BrandCard>
                    </div>
                </section>

                <section id="for-professionals" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <BrandCard className="p-6 sm:p-8 border-[var(--brand-border-strong)]">
                            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-text-primary)]">{t("For Insurance Professionals", "For Insurance Professionals")}</h2>
                            <p className="mt-3 text-sm sm:text-base text-[var(--brand-text-muted)]">{t("Συνεργάσου με πελάτες σε κοινή εικόνα συμβολαίων και με λιγότερα μηνύματα μπρος-πίσω.", "Collaborate with clients in a shared policy view with less back-and-forth.")}</p>
                            <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                <BrandActionButton asChild variant="secondary">
                                    <Link href="/auth/signup?role=agent&source=landing_professionals" onClick={() => handleAgentCtaClick("professionals_section")}>
                                        {t("Γίνε συνεργάτης", "Join as a Professional")}
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild>
                                    <Link href="/dashboard-demo?source=landing_professionals_demo" onClick={() => handleDemoStart("professionals_section")}>
                                        {t("Δες demo συνεργασίας", "See collaboration demo")}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                            </div>
                        </BrandCard>
                    </div>
                </section>

                <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--brand-bg-soft)]/70">
                    <div className="max-w-3xl mx-auto">
                        <BrandSectionHeader title={t("Συχνές ερωτήσεις", "FAQ")} align="center" />
                        <div className="mt-6 space-y-3">
                            {faqItems.map((item, index) => (
                                <BrandCard key={item.q} className="overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const willOpen = faqOpenIndex !== index
                                            setFaqOpenIndex(willOpen ? index : null)
                                            trackWithSchema("faq_opened", { faq_index: index, opened: willOpen })
                                        }}
                                        className="w-full text-left px-5 py-4 font-semibold text-[var(--brand-text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        aria-expanded={faqOpenIndex === index}
                                    >
                                        {item.q}
                                    </button>
                                    {faqOpenIndex === index ? <p className="px-5 pb-4 text-sm text-[var(--brand-text-muted)]">{item.a}</p> : null}
                                </BrandCard>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="final-cta" className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto">
                        <BrandCard className="p-6 sm:p-8">
                            <BrandSectionHeader title={t("Έτοιμος να σταματήσεις την ασφαλιστική σύγχυση σήμερα;", "Ready to stop insurance confusion today?")} subtitle={t("Concierge onboarding slots ανανεώνονται κάθε εβδομάδα.", "Concierge onboarding slots refresh weekly.")} align="center" />
                            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                                <BrandActionButton asChild className="flex-1">
                                    <Link href="/auth/signup?role=policyholder&source=landing_final_policyholder" onClick={() => handlePrimaryCtaClick("final")}>
                                        {heroPrimaryLabel}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </BrandActionButton>
                                <BrandActionButton asChild variant="secondary" className="flex-1">
                                    <Link href="/auth/signup?role=agent&source=landing_final_agent" onClick={() => handleAgentCtaClick("final_agent")}>
                                        {t("Είμαι Ασφαλιστικός Επαγγελματίας", "I'm an Insurance Professional")}
                                    </Link>
                                </BrandActionButton>
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
                        {[{ key: "about", label: "About", href: "#how-it-works" }, { key: "security", label: "Security", href: "#trust-compliance" }, { key: "faq", label: "FAQ", href: "#faq" }, { key: "professionals", label: "For Insurance Professionals", href: "/auth/signup?role=agent&source=landing_footer_professionals" }, { key: "contact", label: "Contact", href: "mailto:support@policywallet.app" }, { key: "terms", label: "Terms", href: "/terms" }, { key: "privacy", label: "Privacy", href: "/privacy" }].map((linkItem) => (
                            <Link key={linkItem.key} href={linkItem.href} onClick={() => trackWithSchema("footer_link_click", { link: linkItem.key })} className="hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                                {linkItem.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>

            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)]/95 backdrop-blur-md p-3">
                <div className="mx-auto max-w-7xl grid grid-cols-[1fr_auto] gap-2">
                    <BrandActionButton asChild className="w-full">
                        <Link href="/auth/signup?role=policyholder&source=landing_mobile_primary" onClick={() => handlePrimaryCtaClick("mobile")}>
                            {heroPrimaryLabel}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </BrandActionButton>
                    <BrandActionButton asChild variant="secondary" className="px-3.5">
                        <Link href="/auth/signup?role=agent&source=landing_mobile_agent" onClick={() => handleAgentCtaClick("mobile_agent")}>
                            <Users className="w-4 h-4" />
                        </Link>
                    </BrandActionButton>
                </div>
            </div>

            {showExitIntent ? (
                <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center">
                    <BrandCard className="w-full max-w-md p-5">
                        <h3 className="text-lg font-bold text-[var(--brand-text-primary)]">{t("Πριν φύγεις, πάρε το Insurance Clarity Checklist", "Before you go, get the Insurance Clarity Checklist")}</h3>
                        <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{t("Άφησε email για να λάβεις δομημένο οδηγό οργάνωσης συμβολαίων.", "Leave your email to get a structured policy organization guide.")}</p>
                        <form className="mt-4 space-y-3" onSubmit={handleWaitlistSubmit}>
                            <input type="email" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} required placeholder={t("Email", "Email")} className="w-full rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
                            <select value={waitlistProfileType} onChange={(e) => setWaitlistProfileType(e.target.value)} className="w-full rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                                <option value="individual">{t("Ιδιώτης", "Individual")}</option>
                                <option value="family">{t("Οικογένεια", "Family")}</option>
                                <option value="small_business">{t("Μικρή επιχείρηση", "Small business")}</option>
                            </select>
                            <select value={waitlistIntent} onChange={(e) => setWaitlistIntent(e.target.value as IntentType | "")} className="w-full rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                                <option value="">{t("Κύριος στόχος (προαιρετικό)", "Primary goal (optional)")}</option>
                                <option value="organize_policies">{t("Οργάνωση συμβολαίων", "Organize policies")}</option>
                                <option value="save_money">{t("Μείωση κόστους", "Save money")}</option>
                                <option value="health_coverage">{t("Κατανόηση καλύψεων", "Understand coverage")}</option>
                                <option value="avoid_missed_renewals">{t("Να μην χάσω ανανεώσεις", "Avoid missed renewals")}</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <BrandActionButton type="submit" className="flex-1">
                                    {t("Στείλε μου τον οδηγό", "Send me the guide")}
                                </BrandActionButton>
                                <BrandActionButton type="button" variant="secondary" onClick={() => setShowExitIntent(false)}>
                                    {t("Κλείσιμο", "Close")}
                                </BrandActionButton>
                            </div>
                        </form>
                    </BrandCard>
                </div>
            ) : null}

            {waitlistSubmitted ? (
                <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60]">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2.5 text-sm font-medium shadow-lg">
                        {t("Ευχαριστούμε! Θα λάβεις το checklist σύντομα.", "Thanks! You will receive the checklist shortly.")}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
