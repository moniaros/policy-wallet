import React from "react"
import Link from "next/link"
import {
    ArrowRight,
    Car,
    CheckCircle2,
    ChevronDown,
    Heart,
    Home,
    Sparkles,
} from "lucide-react"
import type { Language } from "@/lib/i18n"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { localizeHref } from "@/lib/seo/locale-links"
import { productCategories } from "@/lib/product/catalog"
import {
    PRODUCT_FAQS as FAQS,
    PRODUCT_STATS as STATS,
    PRODUCT_STEPS as STEPS,
} from "./marketing-content"
import { ProductFaqList } from "./ProductFaqList"
import { ProductPageView } from "./ProductPageView"
import { ProductScrollButton } from "./ProductScrollButton"

// Static stat tile — the JS count-up animation was dropped per the brand
// doc's motion-restraint rules (decorative, 30ms interval).
function StatItem({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <div className="mb-2 text-h2 font-semibold leading-none tracking-tight text-[#0F172A] dark:text-white lg:text-h1">
                {value}
            </div>
            <div className="mx-auto max-w-[180px] text-body leading-snug text-[#475569] dark:text-slate-300">{label}</div>
        </div>
    )
}

/**
 * The /product page body, server-rendered. `language` arrives as a prop
 * instead of from useLanguage() so none of this copy ships as JS: /product and
 * /en/product are separate routes, each fixing its own locale, and the EL/EN
 * toggle navigates between them (see StaticLanguageProvider) rather than
 * re-rendering translated strings on the client.
 *
 * Client islands, and nothing else: LoBPageShell (nav/mobile-menu state),
 * ProductScrollButton ×2, ProductFaqList (accordion), ProductPageView
 * (analytics).
 */
export function ProductSections({ language }: { language: Language }) {
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={language}>
            <ProductPageView language={language} />

            <section className="px-6 text-center md:px-12">
                <div className="mx-auto max-w-[860px]">
                    <div className="mb-8 inline-flex select-none items-center gap-2 rounded-full bg-[#DCEBDA] dark:bg-[#29685B]/30 px-3 py-1.5 text-caption font-semibold uppercase tracking-wide text-[#166534] dark:text-[#A7F3D0]">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {t("Διαθέσιμο τώρα", "Available now")}
                    </div>

                    <h1 className="mb-6 text-h1 font-semibold leading-[1.02] tracking-[-0.045em] text-[#0F172A] dark:text-white md:text-display">
                        {t(
                            "Όλες οι ασφαλίσεις σας. Ένα έξυπνο πορτοφόλι.",
                            "All your insurance. One intelligent wallet."
                        )}
                    </h1>

                    <p className="mx-auto mb-10 max-w-[640px] text-lead leading-[1.55] text-[#475569] dark:text-slate-300 md:text-title">
                        {t(
                            "Δείτε τι καλύπτει κάθε συμβόλαιο, τι δεν καλύπτει — και τι να κάνετε γι' αυτό.",
                            "See what every policy covers, what it doesn't, and what to do about it."
                        )}
                    </p>

                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <ProductScrollButton
                            targetId="how-it-works"
                            headingId="how-it-works-heading"
                            className="pw-secondary-button pw-btn-lg w-full cursor-pointer sm:w-auto"
                        >
                            <ChevronDown className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                            {t("Πώς λειτουργεί", "See how it works")}
                        </ProductScrollButton>
                    </div>

                    <p className="mt-4 flex items-center justify-center gap-2 text-body text-[#5B6A7A] dark:text-slate-400">
                        <ChevronDown className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                        {t(
                            "Κύλιση στην ίδια σελίδα για τα 3 βήματα.",
                            "Scroll on this page to the 3-step walkthrough."
                        )}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-page px-6 py-20 md:px-12 lg:py-28">
                <div className="grid items-center gap-16 md:grid-cols-2 lg:gap-24">
                    <div>
                        <p className="mb-4 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                            {t("Το Πορτοφόλι σας", "Your wallet")}
                        </p>
                        <h2 className="mb-6 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h1">
                            {t(
                                "Τα απαραίτητα για να διαχειρίζεστε τις ασφαλίσεις σας αβίαστα.",
                                "The essentials to manage your insurance effortlessly."
                            )}
                        </h2>
                        <p className="mb-8 text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                            {t(
                                "Αποκτήστε εξατομικευμένες συστάσεις για να βελτιστοποιήσετε τις καλύψεις σας, να κλείσετε κενά και να εξοικονομήσετε χρήματα.",
                                "Get personalized recommendations to optimize your coverage, close dangerous gaps, and save money on premiums."
                            )}
                        </p>
                        <ul className="space-y-3">
                            {[
                                t("Ανάλυση εγγράφων σε λίγα λεπτά", "Document analysis in minutes"),
                                t("Εντοπισμός κενών και επικαλύψεων", "Gap and overlap detection"),
                                t("Υπενθυμίσεις ανανέωσης και ειδοποιήσεις", "Renewal reminders and alerts"),
                                t("Κοινοποίηση με ασφαλιστές και μεσίτες", "Sharing with insurers and brokers"),
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-body-lg text-[#0F172A] dark:text-white">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative">
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.08)] lg:p-8">
                            <div className="mb-6 flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
                                <div>
                                    <p className="mb-1 text-micro font-semibold uppercase tracking-wider text-[#5B6A7A] dark:text-slate-400">
                                        {t("Πύλη Ασφάλισης", "Insurance Hub")}
                                    </p>
                                    <p className="text-lead font-semibold text-[#0F172A] dark:text-white">
                                        {t("Γεια σου, Νίκο", "Welcome back, Nick")}
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#29685B] text-body font-bold text-white">
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
                                        className={`flex items-center gap-3 rounded-[12px] border p-3.5 ${status === "warn" ? "border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20" : "border-transparent bg-[#F8FAFC] dark:bg-slate-900"}`}
                                    >
                                        <div
                                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${status === "warn" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-[#DCEBDA] dark:bg-[#29685B]/30"}`}
                                        >
                                            <Icon
                                                className={`h-4.5 w-4.5 ${status === "warn" ? "text-amber-700 dark:text-amber-300" : "text-[#29685B] dark:text-[#A7F3D0]"}`}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-body font-medium text-[#0F172A] dark:text-white">
                                                {t(nameEl, nameEn)}
                                            </p>
                                            <p className={`text-caption ${status === "warn" ? "text-amber-700 dark:text-amber-300" : "text-[#5B6A7A] dark:text-slate-400"}`}>
                                                {t(expEl, expEn)}
                                            </p>
                                        </div>
                                        <div
                                            className={`h-2 w-2 flex-shrink-0 rounded-full ${status === "ok" ? "bg-[#29685B]" : "bg-amber-400"}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[12px] bg-[#29685B] px-4 py-3.5 text-body-sm leading-snug text-white">
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

                    </div>
                </div>
            </section>

            <section className="border-y border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 md:px-12">
                <div className="mx-auto grid max-w-[1040px] gap-10 md:grid-cols-3">
                    {STATS.map((stat) => (
                        <StatItem
                            key={stat.labelEn}
                            value={t(stat.valueEl, stat.valueEn)}
                            label={t(stat.labelEl, stat.labelEn)}
                        />
                    ))}
                </div>
            </section>

            <section id="product-categories" className="scroll-mt-32 bg-[#F8FAFC] dark:bg-slate-900 px-6 py-20 md:px-12 lg:scroll-mt-40 lg:py-28">
                <div className="mx-auto max-w-page">
                    <div className="mb-14">
                        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                            {t("Κατηγορίες", "Categories")}
                        </p>
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <h2
                                id="product-categories-heading"
                                tabIndex={-1}
                                className="max-w-[500px] text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white focus:outline-none lg:text-h1"
                            >
                                {t(
                                    "Κάθε ασφάλεια που χρειάζεστε, αναλυμένη για εσάς.",
                                    "Every policy you need, analyzed for you."
                                )}
                            </h2>
                            <ProductScrollButton
                                targetId="product-categories"
                                headingId="product-categories-heading"
                                className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 self-start text-body font-semibold text-[#29685B] dark:text-[#A7F3D0] transition-colors duration-150 hover:text-[#1C4E44] md:self-auto"
                            >
                                {t("Δείτε όλα", "Explore all")}
                                <ChevronDown className="h-4 w-4" />
                            </ProductScrollButton>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {productCategories.map((category) => {
                            const Icon = category.icon

                            return (
                                <Link
                                    key={category.id}
                                    href={localizeHref(category.href, language)}
                                    className={`group flex flex-col rounded-2xl border p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${category.surface} ${category.border}`}
                                >
                                    <div className="mb-6 flex items-start justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/80 shadow-sm backdrop-blur-sm">
                                            <Icon className="h-5 w-5 text-[#0F172A] dark:text-white" />
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-micro font-semibold uppercase tracking-wide ${category.tagBg}`}>
                                            {t(category.tagEl, category.tagEn)}
                                        </span>
                                    </div>

                                    <h3 className="mb-3 text-title font-semibold leading-[1.2] tracking-tight text-[#0F172A] dark:text-white">
                                        {t(category.labelEl, category.labelEn)}
                                    </h3>
                                    <p className="mb-3 text-body font-semibold leading-snug text-[#0F172A] dark:text-white">
                                        {t(category.headlineEl, category.headlineEn)}
                                    </p>
                                    <p className="mb-6 flex-1 text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                        {t(category.descEl, category.descEn)}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-body font-semibold text-[#0F172A] dark:text-white transition-all duration-150 group-hover:gap-2.5">
                                        {t("Δείτε τι αναλύουμε", "See what we analyze")}
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="mx-auto max-w-page scroll-mt-32 px-6 py-20 md:px-12 lg:scroll-mt-40 lg:py-28">
                <div className="mb-16 text-center">
                    <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                        {t("Η Διαδικασία", "The process")}
                    </p>
                    <h2
                        id="how-it-works-heading"
                        tabIndex={-1}
                        className="mx-auto max-w-[560px] text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white focus:outline-none lg:text-h1"
                    >
                        {t(
                            "Από το PDF σε καθαρή εικόνα, χωρίς διάβασμα ψιλών γραμμάτων.",
                            "From PDF to a clear picture, without reading the fine print."
                        )}
                    </h2>
                </div>

                <div className="grid gap-8 md:grid-cols-3 lg:gap-12">
                    {STEPS.map((step) => {
                        const Icon = step.icon

                        return (
                            <div key={step.n} className="relative flex flex-col">
                                <div className="mb-6 flex items-center gap-3">
                                    <span className="rounded-full bg-[#DCEBDA] dark:bg-[#29685B]/30 px-2.5 py-1 text-micro font-bold tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                                        {step.n}
                                    </span>
                                    <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-slate-800" />
                                </div>
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 shadow-sm">
                                    <Icon className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                </div>
                                <h3 className="mb-3 text-title font-semibold leading-snug tracking-tight text-[#0F172A] dark:text-white">
                                    {t(step.titleEl, step.titleEn)}
                                </h3>
                                <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                    {t(step.descEl, step.descEn)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Invented testimonial removed (brand doc §7): only named, consented
                customers may appear here — verifiable facts carry the page until then. */}

            <section id="product-faq" className="mx-auto max-w-[860px] scroll-mt-32 px-6 py-20 md:px-12 lg:scroll-mt-40 lg:py-28">
                <div className="mb-12 text-center">
                    <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                        {t("Ερωτήσεις", "FAQs")}
                    </p>
                    <h2 className="text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h1">
                        {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                    </h2>
                </div>

                <ProductFaqList
                    entries={FAQS.map((faq) => ({ q: t(faq.qEl, faq.qEn), a: t(faq.aEl, faq.aEn) }))}
                />
            </section>

            <section className="bg-[#1A2420] px-6 py-20 text-white md:px-12 lg:py-28">
                <div className="mx-auto max-w-[860px] text-center">
                    <h2 className="mb-6 text-h2 font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-h1 lg:text-display">
                        {t(
                            "Αποκτήστε πρόσβαση στο PolicyWallet για ιδιώτες, ομάδες και επαγγελματίες.",
                            "Get access to the PolicyWallet platform for individuals, teams, and professionals."
                        )}
                    </h2>
                    <p className="mx-auto mb-10 max-w-[540px] text-lead leading-relaxed text-white/60">
                        {t(
                            "Ξεκινήστε δωρεάν. Χωρίς πιστωτική κάρτα.",
                            "Start for free. No credit card required."
                        )}
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href={localizeHref("/pricing", language)}
                            className="pw-secondary-button-inverse pw-btn-lg w-full sm:w-auto"
                        >
                            {t("Δείτε τις τιμές", "View pricing")}
                        </Link>
                    </div>
                </div>
            </section>
        </LoBPageShell>
    )
}
