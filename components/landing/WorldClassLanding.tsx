"use client"

import React, { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { IBM_Plex_Sans } from "next/font/google"
import { useLanguage } from "@/contexts/LanguageContext"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { honestCopy } from "@/lib/honest-copy"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
    ArrowRight,
    Bell,
    Brain,
    CheckCircle2,
    ChevronDown,
    Clock3,
    FileText,
    Lock,
    Search,
    Shield,
    Sparkles,
    Wallet,
} from "lucide-react"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

type Locale = "el" | "en"

const featureIcons = {
    brain: Brain,
    chart: Search,
    share: Bell,
    bell: Clock3,
    shield: Shield,
    wallet: Wallet,
} as const

const valueIcons = [FileText, Search, Shield]

export function WorldClassLanding() {
    const { language, setLanguage } = useLanguage()
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const copy = honestCopy as any
    const lang = language as Locale

    const trustPills = useMemo(
        () => [
            {
                icon: Lock,
                text: {
                    en: "Bank-level encryption",
                    el: "Κρυπτογράφηση τραπεζικού επιπέδου",
                },
            },
            {
                icon: Shield,
                text: {
                    en: "Independent platform",
                    el: "Ανεξάρτητη πλατφόρμα",
                },
            },
            {
                icon: Sparkles,
                text: {
                    en: "MVP in active development",
                    el: "MVP σε ενεργή ανάπτυξη",
                },
            },
        ],
        []
    )

    const cleanBenefit = (value: string) => value.replace(/^[^\p{L}\p{N}]+/u, "").trim()

    const handleEarlyAccess = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
    }

    return (
        <div
            className={`${ibmPlexSans.className} min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100`}
        >
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-[70] focus:top-3 focus:left-3 focus:px-3 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-md">
                {lang === "el" ? "Μετάβαση στο περιεχόμενο" : "Skip to content"}
            </a>

            <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
                <div className="h-16 px-4 sm:px-6 flex items-center justify-between rounded-2xl border border-sky-100/80 bg-white/90 backdrop-blur-xl shadow-xl shadow-sky-900/5 dark:border-slate-700 dark:bg-slate-900/90">
                    <PolicyWalletLogo size="sm" language={lang} />

                    <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <a href="#features" className="hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
                            {lang === "el" ? "Δυνατότητες" : "Features"}
                        </a>
                        <a href="#how-it-works" className="hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
                            {lang === "el" ? "Πώς Λειτουργεί" : "How it Works"}
                        </a>
                        <a href="#faq" className="hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
                            FAQ
                        </a>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden sm:flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                            <button
                                type="button"
                                onClick={() => setLanguage("el")}
                                aria-pressed={lang === "el"}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                                    lang === "el" ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-600 dark:text-slate-400"
                                }`}
                            >
                                ΕΛ
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage("en")}
                                aria-pressed={lang === "en"}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                                    lang === "en" ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300" : "text-slate-600 dark:text-slate-400"
                                }`}
                            >
                                EN
                            </button>
                        </div>

                        <ThemeToggle />

                        <Link
                            href="/auth/signin"
                            className="hidden sm:block px-3 py-2 text-sm font-semibold text-slate-700 hover:text-sky-700 transition-colors dark:text-slate-300 dark:hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
                        >
                            {lang === "el" ? "Σύνδεση" : "Sign in"}
                        </Link>

                        <Link
                            href="/auth/signup"
                            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                        >
                            {lang === "el" ? "Ξεκινήστε" : "Get started"}
                        </Link>
                    </div>
                </div>
            </header>

            <main id="main-content" className="pt-28 sm:pt-32">
                <section className="px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100/80 px-3 py-1.5 text-xs font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300">
                                <Sparkles className="w-3.5 h-3.5" />
                                {copy.hero.badge[lang]}
                            </div>

                            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {copy.hero.title[lang]}
                            </h1>
                            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
                                {copy.hero.subtitle[lang]}
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                {trustPills.map((pill, idx) => {
                                    const Icon = pill.icon
                                    return (
                                        <div
                                            key={idx}
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                        >
                                            <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                            <span>{pill.text[lang]}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-8 bg-white/90 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 max-w-xl shadow-xl shadow-slate-900/5">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {copy.earlyAccess.title[lang]}
                                </h2>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    {copy.earlyAccess.subtitle[lang]}
                                </p>

                                <form onSubmit={handleEarlyAccess} className="mt-5 space-y-3" noValidate>
                                    <div>
                                        <label htmlFor="landing-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {copy.earlyAccess.form.name[lang]}
                                        </label>
                                        <input
                                            id="landing-name"
                                            type="text"
                                            autoComplete="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="landing-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {copy.earlyAccess.form.email[lang]}
                                        </label>
                                        <input
                                            id="landing-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitted}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                                    >
                                        <span>
                                            {submitted
                                                ? lang === "el"
                                                    ? "Επιτυχής αποστολή"
                                                    : "Submitted successfully"
                                                : copy.earlyAccess.form.submit[lang]}
                                        </span>
                                        {!submitted && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                    <p aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
                                        {copy.earlyAccess.form.consent[lang]}
                                    </p>
                                </form>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-sky-400/25 to-cyan-200/25 blur-3xl dark:from-sky-800/30 dark:to-cyan-900/20" />
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <Image
                                        src="/screenshots/desktop-dashboard.png"
                                        alt={lang === "el" ? "Προεπισκόπηση πλατφόρμας PolicyWallet" : "PolicyWallet platform preview"}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <div className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-xs text-sky-800 dark:bg-slate-800 dark:border-slate-700 dark:text-sky-300">
                                        {lang === "el" ? "Κενά κάλυψης" : "Coverage gaps"}
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-300">
                                        {lang === "el" ? "Ανανεώσεις" : "Renewals"}
                                    </div>
                                    <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-800 dark:bg-slate-800 dark:border-slate-700 dark:text-orange-300">
                                        {lang === "el" ? "Συστάσεις AI" : "AI insights"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-4 sm:px-6 lg:px-8 pb-16">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(copy.trust?.items || []).slice(0, 3).map((item: any, idx: number) => (
                            <article
                                key={idx}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title[lang]}</h3>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description[lang]}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="features" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{copy.features.title[lang]}</h2>
                            <p className="mt-3 text-slate-600 dark:text-slate-300">{copy.features.subtitle[lang]}</p>
                        </div>

                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {copy.features.items.map((feature: any, idx: number) => {
                                const Icon = featureIcons[feature.icon as keyof typeof featureIcons] || Brain
                                return (
                                    <article
                                        key={idx}
                                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{feature.title[lang]}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.description[lang]}</p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{copy.value.title[lang]}</h2>
                        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{copy.value.description[lang]}</p>

                        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
                            {copy.problem.items.map((item: any, idx: number) => {
                                const Icon = valueIcons[idx] || Search
                                return (
                                    <article
                                        key={idx}
                                        className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <Icon className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                                        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{item.title[lang]}</h3>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description[lang]}</p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{copy.howItWorks.title[lang]}</h2>
                        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
                            {copy.howItWorks.steps.map((step: any, idx: number) => (
                                <article
                                    key={idx}
                                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-sky-100 px-3 text-sm font-bold text-sky-800 dark:bg-slate-800 dark:text-sky-300">
                                        {step.number}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{step.title[lang]}</h3>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.description[lang]}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-7xl mx-auto rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 text-white p-8 sm:p-12 shadow-2xl">
                        <h2 className="text-3xl sm:text-4xl font-bold">{copy.showcase?.title[lang] || (lang === "el" ? "Ολοκληρωμένος Έλεγχος" : "Complete Control")}</h2>
                        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(copy.showcase?.benefits || []).map((benefit: { en: string; el: string }, idx: number) => (
                                <li key={idx} className="flex items-start gap-3 rounded-xl bg-white/10 px-4 py-3">
                                    <CheckCircle2 className="mt-0.5 w-5 h-5 text-orange-300 flex-shrink-0" />
                                    <span className="text-sm sm:text-base">{cleanBenefit(benefit[lang])}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8">
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                            >
                                {copy.hero.cta.primary[lang]}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 dark:text-white">{copy.faq.title[lang]}</h2>
                        <div className="mt-8 space-y-3">
                            {copy.faq.items.map((item: any, idx: number) => (
                                <details
                                    key={idx}
                                    className="group rounded-xl border border-slate-200 bg-white p-0 open:shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <summary className="list-none cursor-pointer flex items-center justify-between p-5">
                                        <span className="font-semibold text-slate-900 dark:text-white">{item.question[lang]}</span>
                                        <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-5 pb-5 text-sm leading-relaxed text-slate-600 border-t border-slate-100 dark:text-slate-300 dark:border-slate-800">
                                        {item.answer[lang]}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                            {lang === "el" ? "Έτοιμοι να ξεκινήσετε;" : "Ready to get started?"}
                        </h2>
                        <p className="mt-3 text-slate-600 dark:text-slate-300">
                            {lang === "el"
                                ? "Δοκιμάστε δωρεάν και οργανώστε τα συμβόλαιά σας σε ένα μέρος."
                                : "Start free and bring all your policies into one secure place."}
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                            >
                                {copy.hero.cta.primary[lang]}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                {lang === "el" ? "Σύνδεση" : "Sign in"}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white/70 py-10 px-4 sm:px-6 lg:px-8 text-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <PolicyWalletLogo size="sm" language={lang} />
                        <span className="text-slate-500 dark:text-slate-400">{copy.footer.tagline[lang]}</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-600 dark:text-slate-300">
                        <Link href="/privacy" className="hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
                            {copy.footer.legal.privacy[lang]}
                        </Link>
                        <Link href="/terms" className="hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
                            {copy.footer.legal.terms[lang]}
                        </Link>
                        <span className="text-slate-500 dark:text-slate-400">{copy.footer.copyright[lang]}</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
