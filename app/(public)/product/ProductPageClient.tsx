"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
    ArrowRight,
    Car,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Heart,
    Home,
    Sparkles,
} from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { productCategories } from "@/lib/product/catalog"
import {
    PRODUCT_FAQS as FAQS,
    PRODUCT_STATS as STATS,
    PRODUCT_STEPS as STEPS,
} from "./marketing-content"

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div className={`border-b border-[#E5E7EB] transition-colors duration-150 ${open ? "bg-white" : ""}`}>
            <button
                type="button"
                className="group flex w-full items-center justify-between px-1 py-5 text-left"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
            >
                <span className="text-[17px] font-medium text-[#0F172A] transition-colors duration-150 group-hover:text-[#29685B]">
                    {q}
                </span>
                {open ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-[#29685B]" />
                ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#64748B] transition-colors duration-150 group-hover:text-[#29685B]" />
                )}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-[300px] pb-5" : "max-h-0"}`}>
                <p className="px-1 text-[16px] leading-relaxed text-[#475569]">{a}</p>
            </div>
        </div>
    )
}

function useCountUp(target: string, isVisible: boolean): string {
    // Initialized to the real value so server-rendered HTML (what crawlers
    // and no-JS clients see) shows the actual stat; the 0→target animation
    // only takes over client-side once the section scrolls into view.
    const [count, setCount] = useState(target)

    useEffect(() => {
        if (!isVisible) return

        const num = parseFloat(target.replace(/[^0-9.]/g, ""))
        if (Number.isNaN(num)) {
            setCount(target)
            return
        }

        const step = num / 40
        let current = 0
        const timer = window.setInterval(() => {
            current = Math.min(current + step, num)
            const formatted = target.replace(/[0-9.]+/, Math.round(current).toString())
            setCount(formatted)
            if (current >= num) {
                window.clearInterval(timer)
            }
        }, 30)

        return () => window.clearInterval(timer)
    }, [isVisible, target])

    return count
}

function StatItem({ value, label, visible }: { value: string; label: string; visible: boolean }) {
    const animated = useCountUp(value, visible)

    return (
        <div className="text-center">
            <div className="mb-2 text-[42px] font-medium leading-none tracking-tight text-[#0F172A] lg:text-[52px]">
                {animated}
            </div>
            <div className="mx-auto max-w-[180px] text-[15px] leading-snug text-[#475569]">{label}</div>
        </div>
    )
}

export default function ProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const statsRef = useRef<HTMLDivElement>(null)
    const categoriesHeadingRef = useRef<HTMLHeadingElement>(null)
    const howItWorksHeadingRef = useRef<HTMLHeadingElement>(null)
    const [statsVisible, setStatsVisible] = useState(false)

    useEffect(() => {
        trackLandingEvent("page_view_product", { locale: language as any })
    }, [language])

    useEffect(() => {
        const el = statsRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStatsVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.3 }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const scrollToSection = (
        sectionId: string,
        headingRef: React.RefObject<HTMLHeadingElement | null>
    ) => {
        const section = document.getElementById(sectionId)
        if (!section) return

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        section.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
        })

        if (headingRef.current) {
            window.setTimeout(() => {
                headingRef.current?.focus({ preventScroll: true })
            }, prefersReducedMotion ? 0 : 450)
        }
    }

    return (
        <LoBPageShell activeNav="product">
            <section className="px-6 text-center md:px-12">
                <div className="mx-auto max-w-[860px]">
                    <div className="mb-8 inline-flex select-none items-center gap-2 rounded-full bg-[#DCEBDA] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#1A4A1A]">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {t("Διαθέσιμο τώρα", "Available now")}
                    </div>

                    <h1 className="mb-6 text-[48px] font-medium leading-[1.02] tracking-[-0.045em] text-[#0F172A] md:text-[68px] lg:text-[78px]">
                        {t(
                            "Όλες οι ασφαλίσεις σας. Ένα έξυπνο πορτοφόλι.",
                            "All your insurance. One intelligent wallet."
                        )}
                    </h1>

                    <p className="mx-auto mb-10 max-w-[640px] text-[19px] leading-[1.55] text-[#475569] md:text-[23px]">
                        {t(
                            "Μεγιστοποιήστε τα ασφαλιστικά σας οφέλη με έξυπνες αναλύσεις, εντοπισμό κενών και υπενθυμίσεις πρόληψης, όλα σε ένα μέρος.",
                            "Maximize your insurance benefits with intelligent insights, gap detection, and preventive care reminders, all in one place."
                        )}
                    </p>

                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href="/auth/signup"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors duration-150 hover:bg-[#1C4E44] sm:w-auto"
                        >
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button
                            type="button"
                            aria-controls="how-it-works"
                            onClick={() => scrollToSection("how-it-works", howItWorksHeadingRef)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-[#E2E8F0] bg-white px-8 py-3.5 text-[16px] font-medium text-[#0F172A] transition-colors duration-150 hover:border-[#CBD5E1] hover:bg-[#F8FAFC] sm:w-auto"
                        >
                            <ChevronDown className="h-4 w-4 text-[#29685B]" />
                            {t("Πώς λειτουργεί", "See how it works")}
                        </button>
                    </div>

                    <p className="mt-4 flex items-center justify-center gap-2 text-[14px] text-[#64748B]">
                        <ChevronDown className="h-4 w-4 text-[#29685B]" />
                        {t(
                            "Κύλιση στην ίδια σελίδα για τα 3 βήματα.",
                            "Scroll on this page to the 3-step walkthrough."
                        )}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-12">
                <div className="grid items-center gap-16 md:grid-cols-2 lg:gap-24">
                    <div>
                        <p className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[#29685B]">
                            {t("Το Πορτοφόλι σας", "Your wallet")}
                        </p>
                        <h2 className="mb-6 text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-[44px]">
                            {t(
                                "Τα απαραίτητα για να διαχειρίζεστε τις ασφαλίσεις σας αβίαστα.",
                                "The essentials to manage your insurance effortlessly."
                            )}
                        </h2>
                        <p className="mb-8 text-[18px] leading-relaxed text-[#475569]">
                            {t(
                                "Αποκτήστε εξατομικευμένες συστάσεις για να βελτιστοποιήσετε τις καλύψεις σας, να κλείσετε κενά και να εξοικονομήσετε χρήματα.",
                                "Get personalized recommendations to optimize your coverage, close dangerous gaps, and save money on premiums."
                            )}
                        </p>
                        <ul className="space-y-3">
                            {[
                                t("Ανάλυση εγγράφων σε δευτερόλεπτα", "Document analysis in seconds"),
                                t("Εντοπισμός κενών και επικαλύψεων", "Gap and overlap detection"),
                                t("Υπενθυμίσεις ανανέωσης και ειδοποιήσεις", "Renewal reminders and alerts"),
                                t("Κοινοποίηση με ασφαλιστές και μεσίτες", "Sharing with insurers and brokers"),
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-[16px] text-[#0F172A]">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B]" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative">
                        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,0.08)] lg:p-8">
                            <div className="mb-6 flex items-center justify-between border-b border-[#F0F0F0] pb-4">
                                <div>
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                        {t("Πύλη Ασφάλισης", "Insurance Hub")}
                                    </p>
                                    <p className="text-[18px] font-semibold text-[#0F172A]">
                                        {t("Γεια σου, Νίκο", "Welcome back, Nick")}
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#29685B] text-[14px] font-bold text-white">
                                    N
                                </div>
                            </div>

                            <div className="mb-6 space-y-3">
                                {[
                                    {
                                        icon: Car,
                                        nameEl: "Ασφάλεια Αυτοκινήτου",
                                        nameEn: "Motor Insurance",
                                        status: "ok",
                                        expEl: "Λήγει 15 Ιουν",
                                        expEn: "Expires Jun 15",
                                    },
                                    {
                                        icon: Home,
                                        nameEl: "Ασφάλεια Κατοικίας",
                                        nameEn: "Home Insurance",
                                        status: "warn",
                                        expEl: "Λήγει 3 Μαρ",
                                        expEn: "Expires Mar 3",
                                    },
                                    {
                                        icon: Heart,
                                        nameEl: "Ατομική Υγεία",
                                        nameEn: "Health Plan",
                                        status: "ok",
                                        expEl: "Λήγει 1 Ιαν",
                                        expEn: "Expires Jan 1",
                                    },
                                ].map(({ icon: Icon, nameEl, nameEn, status, expEl, expEn }) => (
                                    <div
                                        key={nameEn}
                                        className={`flex items-center gap-3 rounded-[12px] border p-3.5 ${status === "warn" ? "border-amber-100 bg-amber-50" : "border-transparent bg-[#F8FAFC]"}`}
                                    >
                                        <div
                                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${status === "warn" ? "bg-amber-100" : "bg-[#DCEBDA]"}`}
                                        >
                                            <Icon
                                                className={`h-4.5 w-4.5 ${status === "warn" ? "text-amber-600" : "text-[#29685B]"}`}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[14px] font-medium text-[#0F172A]">
                                                {t(nameEl, nameEn)}
                                            </p>
                                            <p className={`text-[12px] ${status === "warn" ? "text-amber-600" : "text-[#64748B]"}`}>
                                                {t(expEl, expEn)}
                                            </p>
                                        </div>
                                        <div
                                            className={`h-2 w-2 flex-shrink-0 rounded-full ${status === "ok" ? "bg-[#29685B]" : "bg-amber-400"}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[12px] bg-[#29685B] px-4 py-3.5 text-[13px] leading-snug text-white">
                                <p className="mb-0.5 flex items-center gap-2 font-bold">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {t("AI Σύσταση", "AI Recommendation")}
                                </p>
                                <p className="text-white/80">
                                    {t(
                                        "Η κατοικία σας υπο-ασφαλίζεται κατά 12%. Ανεβάστε τιμή rebuild cost.",
                                        "Your home is under-insured by 12%. Update your rebuild cost coverage."
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="absolute -right-4 -top-4 rounded-full bg-[#29685B] px-3 py-1.5 text-[12px] font-bold text-white shadow-lg">
                            AI Powered
                        </div>
                    </div>
                </div>
            </section>

            <section ref={statsRef} className="border-y border-[#E5E7EB] bg-white px-6 py-16 md:px-12">
                <div className="mx-auto grid max-w-[1040px] gap-10 md:grid-cols-3">
                    {STATS.map((stat) => (
                        <StatItem
                            key={stat.labelEn}
                            value={t(stat.valueEl, stat.valueEn)}
                            label={t(stat.labelEl, stat.labelEn)}
                            visible={statsVisible}
                        />
                    ))}
                </div>
            </section>

            <section id="product-categories" className="scroll-mt-32 bg-[#F8FAFC] px-6 py-24 md:px-12 lg:scroll-mt-40">
                <div className="mx-auto max-w-[1240px]">
                    <div className="mb-14">
                        <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#29685B]">
                            {t("Κατηγορίες", "Categories")}
                        </p>
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <h2
                                ref={categoriesHeadingRef}
                                tabIndex={-1}
                                className="max-w-[500px] text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0F172A] focus:outline-none lg:text-[44px]"
                            >
                                {t(
                                    "Κάθε ασφάλεια που χρειάζεστε, αναλυμένη για εσάς.",
                                    "Every policy you need, analyzed for you."
                                )}
                            </h2>
                            <button
                                type="button"
                                aria-controls="product-categories"
                                onClick={() => scrollToSection("product-categories", categoriesHeadingRef)}
                                className="inline-flex flex-shrink-0 items-center gap-1.5 self-start text-[15px] font-medium text-[#29685B] transition-colors duration-150 hover:text-[#1C4E44] md:self-auto"
                            >
                                {t("Δείτε όλα", "Explore all")}
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {productCategories.map((category) => {
                            const Icon = category.icon

                            return (
                                <Link
                                    key={category.id}
                                    href={category.href}
                                    className={`group flex flex-col rounded-[20px] border p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${category.surface} ${category.border}`}
                                >
                                    <div className="mb-6 flex items-start justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/80 shadow-sm backdrop-blur-sm">
                                            <Icon className="h-5 w-5 text-[#0F172A]" />
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${category.tagBg}`}>
                                            {t(category.tagEl, category.tagEn)}
                                        </span>
                                    </div>

                                    <h3 className="mb-3 text-[22px] font-medium leading-[1.2] tracking-tight text-[#0F172A]">
                                        {t(category.labelEl, category.labelEn)}
                                    </h3>
                                    <p className="mb-3 text-[14px] font-semibold leading-snug text-[#0F172A]">
                                        {t(category.headlineEl, category.headlineEn)}
                                    </p>
                                    <p className="mb-6 flex-1 text-[14px] leading-relaxed text-[#475569]">
                                        {t(category.descEl, category.descEn)}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#0F172A] transition-all duration-150 group-hover:gap-2.5">
                                        {t("Μάθετε περισσότερα", "Learn more")}
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="mx-auto max-w-[1240px] scroll-mt-32 px-6 py-24 md:px-12 lg:scroll-mt-40">
                <div className="mb-16 text-center">
                    <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#29685B]">
                        {t("Η Διαδικασία", "The process")}
                    </p>
                    <h2
                        ref={howItWorksHeadingRef}
                        tabIndex={-1}
                        className="mx-auto max-w-[560px] text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0F172A] focus:outline-none lg:text-[44px]"
                    >
                        {t(
                            "Τρία βήματα για τον πλήρη έλεγχο των ασφαλίσεών σας.",
                            "Three steps to full control of your insurance."
                        )}
                    </h2>
                </div>

                <div className="grid gap-8 md:grid-cols-3 lg:gap-12">
                    {STEPS.map((step) => {
                        const Icon = step.icon

                        return (
                            <div key={step.n} className="relative flex flex-col">
                                <div className="mb-6 flex items-center gap-3">
                                    <span className="rounded-full bg-[#DCEBDA] px-2.5 py-1 text-[11px] font-bold tracking-widest text-[#29685B]">
                                        {step.n}
                                    </span>
                                    <div className="h-px flex-1 bg-[#E5E7EB]" />
                                </div>
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#E5E7EB] bg-[#F8FAFC] shadow-sm">
                                    <Icon className="h-5 w-5 text-[#29685B]" />
                                </div>
                                <h3 className="mb-3 text-[20px] font-semibold leading-snug tracking-tight text-[#0F172A]">
                                    {t(step.titleEl, step.titleEn)}
                                </h3>
                                <p className="text-[15px] leading-relaxed text-[#475569]">
                                    {t(step.descEl, step.descEn)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section className="bg-[#F8FAFC] px-6 py-24 md:px-12">
                <div className="mx-auto max-w-[780px] text-center">
                    <div className="mb-8 flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, index) => (
                            <svg key={index} className="h-5 w-5 fill-[#29685B] text-[#29685B]" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                        ))}
                    </div>
                    <blockquote className="mb-8 text-[22px] font-medium leading-[1.4] tracking-[-0.02em] text-[#0F172A] md:text-[28px]">
                        {t(
                            "«Ανακάλυψα ότι το σπίτι μου ήταν ανασφάλιστο κατά €40.000 σε rebuild cost. Η πλατφόρμα το εντόπισε σε 2 λεπτά.»",
                            '"I discovered my home was under-insured by €40,000 in rebuild cost. The platform caught it in 2 minutes."'
                        )}
                    </blockquote>
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#29685B] text-[14px] font-bold text-white">
                            Μ
                        </div>
                        <div className="text-left">
                            <p className="text-[15px] font-semibold text-[#0F172A]">{t("Μαρία Π.", "Maria P.")}</p>
                            <p className="text-[13px] text-[#64748B]">
                                {t("Ιδιοκτήτρια κατοικίας, Αθήνα", "Homeowner, Athens")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="product-faq" className="mx-auto max-w-[860px] scroll-mt-32 px-6 py-24 md:px-12 lg:scroll-mt-40">
                <div className="mb-12 text-center">
                    <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#29685B]">
                        {t("Ερωτήσεις", "FAQs")}
                    </p>
                    <h2 className="text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-[40px]">
                        {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                    </h2>
                </div>

                <div className="border-t border-[#E5E7EB]">
                    {FAQS.map((faq) => (
                        <FAQItem key={faq.qEn} q={t(faq.qEl, faq.qEn)} a={t(faq.aEl, faq.aEn)} />
                    ))}
                </div>
            </section>

            <section className="bg-[#1A2420] px-6 py-28 text-white md:px-12">
                <div className="mx-auto max-w-[860px] text-center">
                    <h2 className="mb-6 text-[36px] font-medium leading-[1.05] tracking-[-0.04em] text-white md:text-[52px] lg:text-[60px]">
                        {t(
                            "Αποκτήστε πρόσβαση στο PolicyWallet για ιδιώτες, ομάδες και επαγγελματίες.",
                            "Get access to the PolicyWallet platform for individuals, teams, and professionals."
                        )}
                    </h2>
                    <p className="mx-auto mb-10 max-w-[540px] text-[18px] leading-relaxed text-white/60">
                        {t(
                            "Ξεκινήστε δωρεάν. Χωρίς πιστωτική κάρτα.",
                            "Start for free. No credit card required."
                        )}
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/auth/signup"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#89D9B2] px-8 py-4 text-[16px] font-bold text-[#0F172A] transition-opacity duration-150 hover:opacity-90 sm:w-auto"
                        >
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex w-full items-center justify-center rounded-[4px] border border-white/20 bg-white/5 px-8 py-4 text-[16px] font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white sm:w-auto"
                        >
                            {t("Δείτε τις τιμές", "View pricing")}
                        </Link>
                    </div>
                </div>
            </section>
        </LoBPageShell>
    )
}
