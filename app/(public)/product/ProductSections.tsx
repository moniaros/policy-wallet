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
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import { productCategories } from "@/lib/product/catalog"
import {
    PRODUCT_FAQS as FAQS,
    PRODUCT_STATS as STATS,
    PRODUCT_STEPS as STEPS,
} from "./marketing-content"
import { CATEGORY_NAME, PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"
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
                    {/* The category claim, in the same slot the homepage uses —
                        the platform's own page names the platform's category. */}
                    <div className="mb-8 inline-flex select-none items-center gap-2 rounded-full bg-[#DCEBDA] dark:bg-[#29685B]/30 px-3 py-1.5 text-caption font-semibold uppercase tracking-wide text-[#166534] dark:text-[#A7F3D0]">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {t(CATEGORY_NAME.el, CATEGORY_NAME.en)}
                    </div>

                    <h1 className="mb-6 inline-flex min-h-[24px] items-center text-h1 font-semibold leading-[1.02] tracking-[-0.045em] text-[#0F172A] dark:text-white md:text-display text-balance">
                        {t(
                            "Κάθε ασφάλειά σας, διαβασμένη για εσάς.",
                            "Every policy you own, read for you."
                        )}
                    </h1>

                    <p className="mx-auto mb-10 max-w-[640px] text-lead leading-[1.55] text-[#475569] dark:text-slate-300 md:text-title">
                        {t(
                            "Δεν πουλάμε ασφάλειες — σας λέμε αν είστε καλυμμένοι. Δείτε τι καλύπτει κάθε συμβόλαιο και τι δεν καλύπτει.",
                            "We do not sell insurance — we tell you if you are covered. See what every policy covers and what it does not."
                        )}
                    </p>

                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link href={authHref("/auth/signup", language)} className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {pick(PRIMARY_ACTION, language)}
                            <ArrowRight aria-hidden className="h-4 w-4" />
                        </Link>
                        <ProductScrollButton
                            targetId="how-it-works"
                            headingId="how-it-works-heading"
                            className="pw-secondary-button pw-btn-lg w-full cursor-pointer sm:w-auto"
                        >
                            <ChevronDown className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                            {t("Πώς λειτουργεί", "How it works")}
                        </ProductScrollButton>
                    </div>

                    {/* The line that used to sit here repeated the button
                        beside it ("See how it works" / "Scroll to the 3 steps").
                        The reassurance the visitor actually needs is the price. */}
                    <p className="mt-4 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                        {t(
                            "Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα.",
                            "Free for 3 policies. No card."
                        )}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-page px-6 py-20 md:px-12 lg:py-28">
                <div className="grid items-center gap-16 md:grid-cols-2 lg:gap-24">
                    <div>
                        <h2 className="mb-6 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h1 text-balance">
                            {t(
                                "Καθαρές απαντήσεις, χωρίς να διαβάσετε ούτε μία σελίδα.",
                                "Clear answers, without reading a single page."
                            )}
                        </h2>
                        <p className="mb-8 text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                            {t(
                                "Με το Family, σας λέμε τι λείπει από την κάλυψή σας, τι πληρώνετε δύο φορές και τι αξίζει να διορθώσετε πρώτα.",
                                "With Family, we tell you what your cover is missing, what you are paying for twice, and what is worth fixing first."
                            )}
                        </p>
                        <ul className="space-y-3">
                            {[
                                t("Διαβάζουμε κάθε συμβόλαιο σε λίγα λεπτά", "We read every policy in minutes"),
                                t("Βρίσκουμε κενά και διπλές καλύψεις — με το Plus", "We find gaps and doubled-up cover — with Plus"),
                                t("Σας ειδοποιούμε πριν λήξει κάτι — από το πλάνο Plus", "We warn you before something runs out — from the Plus plan"),
                                // `agentCollaboration` is false on free AND on
                                // Starter, true only on pro — the plan displayed
                                // as Family. /pricing's own comparison
                                // row reads Όχι / Όχι / Ναι, and the homepage card
                                // making this same promise already names the plan.
                                // This was the only unqualified bullet in a list
                                // where the other three all carry their plan.
                                t("Δείχνετε στον ασφαλιστή σας ό,τι θέλετε — με το Family", "You show your agent whatever you choose — with Family"),
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-body-lg text-[#0F172A] dark:text-white">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Illustration — described once, so assistive tech is not
                        read a list of example policies as though they were the
                        visitor's own. */}
                    <div
                        role="img"
                        aria-label={t(
                            "Παράδειγμα: τρεις ασφάλειες με τις ημερομηνίες λήξης τους, και μια επισήμανση ότι το σπίτι είναι ασφαλισμένο για λιγότερα από όσα κοστίζει να ξαναχτιστεί.",
                            "Example: three policies with their end dates, and a note that the home is insured for less than it would cost to rebuild."
                        )}
                        className="relative"
                    >
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.08)] lg:p-8">
                            <div className="mb-6 flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
                                <div>
                                    <p className="mb-1 text-micro font-semibold uppercase tracking-wider text-[#5B6A7A] dark:text-slate-400">
                                        {t("Οι ασφάλειές σας", "Your policies")}
                                    </p>
                                    <p className="text-lead font-semibold text-[#0F172A] dark:text-white">
                                        {t("Γεια σου, Νίκο", "Hi, Nick")}
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
                                        nameEn: "Individual Health",
                                        status: "ok",
                                        expEl: "Λήγει 1 Ιαν",
                                        expEn: "Expires Jan 1",
                                    },
                                ].map(({ icon: Icon, nameEl, nameEn, status, expEl, expEn }) => (
                                    <div
                                        key={nameEn}
                                        className={`flex items-center gap-3 rounded-xl border p-3.5 ${status === "warn" ? "border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20" : "border-transparent bg-[#F8FAFC] dark:bg-slate-900"}`}
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

                            <div className="rounded-xl bg-[#29685B] px-4 py-3.5 text-body-sm leading-snug text-white">
                                <p className="mb-0.5 flex items-center gap-2 font-bold">
                                    <Sparkles aria-hidden className="h-3.5 w-3.5" />
                                    {t("Τι βρήκαμε", "What we found")}
                                </p>
                                <p className="text-white/80">
                                    {t(
                                        "Το σπίτι σας είναι ασφαλισμένο για λιγότερα από όσα κοστίζει να ξαναχτιστεί.",
                                        "Your home is insured for less than it would cost to rebuild it."
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

            {/* NOTE ON COLOUR: `category.surface` is a FIXED light tint
                (bg-[#DCEBDA] and friends) declared in lib/product/catalog.tsx,
                which the authenticated app shares — it has no dark-mode
                variant. The cards below used to carry `dark:text-white` and
                `dark:text-slate-300`, which in dark mode painted white text
                onto a pale green card: a serious contrast failure axe flagged
                on every one of the 15 product pages. The surface is light in
                BOTH themes, so the text on it stays dark in both themes. */}
            <section id="product-categories" className="scroll-mt-32 bg-[#F8FAFC] dark:bg-slate-900 px-6 py-20 md:px-12 lg:scroll-mt-40 lg:py-28">
                <div className="mx-auto max-w-page">
                    <div className="mb-14">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <h2
                                id="product-categories-heading"
                                tabIndex={-1}
                                className="max-w-[500px] text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white focus:outline-none lg:text-h1"
                            >
                                {t(
                                    `${productCategories.length} είδη συμβολαίων. Μία ανάλυση.`,
                                    `${productCategories.length} kinds of policies. One analysis.`
                                )}
                            </h2>
                            <ProductScrollButton
                                targetId="product-categories"
                                headingId="product-categories-heading"
                                className="inline-flex min-h-11 flex-shrink-0 cursor-pointer items-center gap-1.5 self-start text-body font-semibold text-[#29685B] transition-colors duration-150 hover:text-[#1C4E44] md:self-auto dark:text-[#A7F3D0]"
                            >
                                {t("Δείτε όλα", "See all")}
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
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm backdrop-blur-sm">
                                            <Icon className="h-5 w-5 text-[#0F172A]" />
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-micro font-semibold uppercase tracking-wide ${category.tagBg}`}>
                                            {t(category.tagEl, category.tagEn)}
                                        </span>
                                    </div>

                                    <h3 className="mb-3 text-title font-semibold leading-[1.2] tracking-tight text-[#0F172A]">
                                        {t(category.labelEl, category.labelEn)}
                                    </h3>
                                    <p className="mb-3 text-body font-semibold leading-snug text-[#0F172A]">
                                        {t(category.headlineEl, category.headlineEn)}
                                    </p>
                                    <p className="mb-6 flex-1 text-body leading-relaxed text-[#475569]">
                                        {t(category.descEl, category.descEn)}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-body font-semibold text-[#0F172A] transition-all duration-150 group-hover:gap-2.5">
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
                    {/* The mechanism, named on the page and not only in the
                        search snippet. The metas have said "με AI" for months
                        while no visible sentence anywhere told a visitor that a
                        model reads their document — so the first place they
                        learned it was the consent dialog. Naming it here, with
                        its limit, and linking to the page that explains it. */}
                    <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">
                        {t(
                            "Το έγγραφό σας το διαβάζει τεχνητή νοημοσύνη και το μεταφράζει σε δεδομένα. Ποια κενά κάλυψης έχετε το κρίνουν κανόνες, όχι το μοντέλο.",
                            "Artificial intelligence reads your document and turns it into data. Which coverage gaps you have is decided by rules, not by the model."
                        )}{" "}
                        <Link href={localizeHref("/platform", language)} className="underline">
                            {t("Δείτε πώς ακριβώς", "See exactly how")}
                        </Link>
                    </p>
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
                    <h2 className="text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h1 text-balance">
                        {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                    </h2>
                </div>

                <ProductFaqList
                    entries={FAQS.map((faq) => ({ q: t(faq.qEl, faq.qEn), a: t(faq.aEl, faq.aEn) }))}
                />
            </section>

            <section className="bg-cta-dark px-6 py-20 text-white md:px-12 lg:py-28">
                <div className="mx-auto max-w-[860px] text-center">
                    <h2 className="mb-6 text-h2 font-semibold leading-[1.05] tracking-[-0.04em] text-white [overflow-wrap:anywhere] md:text-h1 lg:text-display">
                        {t(
                            "Στείλτε ένα συμβόλαιο και δείτε τι βρίσκουμε.",
                            "Send us a policy and see what we find."
                        )}
                    </h2>
                    <p className="mx-auto mb-10 max-w-[540px] text-lead leading-relaxed text-white/75">
                        {t(
                            CTA_REASSURANCE.el,
                            "Free for 3 policies. No card. Delete everything whenever you want."
                        )}
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link href={authHref("/auth/signup", language)} className="pw-primary-button-mint pw-btn-lg w-full sm:w-auto">
                            {pick(PRIMARY_ACTION, language)}
                            <ArrowRight aria-hidden className="h-4 w-4" />
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
