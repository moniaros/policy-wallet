"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { ArrowRight, Menu, X, Upload, Sparkles, CheckCircle } from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { TrustBadges } from "@/components/landing/TrustBadges"
import { TrustStrip } from "@/components/ui/TrustStrip"
import { PartnerPerksSection } from "@/components/landing/PartnerPerksSection"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"
import { PolicyWalletWidget } from "@/components/landing/PolicyWalletWidget"
import { ServicesGrid } from "@/components/landing/ServicesGrid"
import { AudienceTabs } from "@/components/landing/AudienceTabs"

const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })

interface WorldClassLandingProps {
    locale: LandingLocale
    /** Live partner offers from getPublicPartnerOffers(); empty/omitted ⇒ the
     *  #perks section and its nav link render nothing (honesty rule). */
    partnerOffers?: PartnerOfferView[]
}

export function WorldClassLanding({ locale, partnerOffers = [] }: WorldClassLandingProps) {
    const isGreek = locale === "el"
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        trackLandingEvent("page_view_landing", {
            locale,
            page_variant: "policywallet_landing_v2",
        })
    }, [locale])

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    const trackCta = (location: string) => {
        trackLandingEvent("cta_clicked_hero", {
            locale,
            cta: "start_free",
            location,
        })
    }

    return (
        <div
            className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#206756]/20 selection:text-[#0F172A]`}
        >
            {/* ── NAV ──────────────────────────────────────────────── */}
            <header className="fixed left-4 right-4 top-4 z-50">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full border border-gray-200/50 bg-white/80 px-6 shadow-sm backdrop-blur-xl transition-all duration-300">
                    <Link
                        href="/"
                        className="inline-flex items-center text-[20px] font-bold tracking-tight"
                    >
                        <span className="text-[#0F172A]">Policy</span>
                        <span className="text-[#64748B]">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-[14px] font-medium text-[#475569] md:flex">
                        <Link href="/product" className="transition-colors hover:text-[#0F172A]">
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsDropdown language={locale} />
                        <Link href="#services" className="transition-colors hover:text-[#0F172A]">
                            {t("Υπηρεσίες", "Services")}
                        </Link>
                        {partnerOffers.length > 0 && (
                            <Link href="#perks" className="transition-colors hover:text-[#0F172A]">
                                {t("Παροχές", "Benefits")}
                            </Link>
                        )}
                        <Link href="/company" className="transition-colors hover:text-[#0F172A]">
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href="/pricing" className="transition-colors hover:text-[#0F172A]">
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="hidden items-center gap-5 md:flex">
                        <div className="flex items-center gap-2">
                            <Link
                                href="/"
                                className={`text-xs font-semibold transition-colors ${
                                    locale === "el"
                                        ? "text-[#0F172A]"
                                        : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                            >
                                ΕΛ
                            </Link>
                            <span className="text-[#E2E8F0]">|</span>
                            <Link
                                href="/en"
                                className={`text-xs font-semibold transition-colors ${
                                    locale === "en"
                                        ? "text-[#0F172A]"
                                        : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                            >
                                EN
                            </Link>
                        </div>
                        <Link
                            href="/auth/signin?source=landing_nav_login"
                            className="text-[14px] font-medium text-[#0F172A] transition-colors hover:text-[#29685B]"
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder&source=landing_nav"
                            onClick={() => trackCta("nav")}
                            className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="-mr-2 p-2 text-[#0F172A] md:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t("Άνοιγμα μενού", "Open menu")}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* ── MOBILE MENU ──────────────────────────────────────── */}
            <div
                className={`fixed inset-0 z-[100] flex flex-col bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
                }`}
            >
                <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6 pt-4">
                    <Link
                        href="/"
                        className="inline-flex items-center text-[20px] font-bold tracking-tight"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <button
                        type="button"
                        className="-mr-2 rounded-full p-2 transition-colors hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label={t("Κλείσιμο μενού", "Close menu")}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-8 pb-24 sm:px-12">
                    <nav className="mb-12 flex flex-col gap-6 text-[44px] font-medium leading-tight tracking-tight sm:text-[56px]">
                        <Link
                            href="/product"
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsMobileGroup
                            language={locale}
                            onNavigate={() => setIsMobileMenuOpen(false)}
                            className="text-[20px] sm:text-[22px]"
                        />
                        <Link
                            href="/company"
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link
                            href="/pricing"
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="mt-auto flex flex-col gap-4">
                        <Link
                            href="/auth/signin?source=landing_nav_login"
                            className="w-full rounded-2xl border border-transparent bg-[#1C4E44] px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#143B33]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder&source=landing_nav"
                            className="w-full rounded-2xl bg-[#337D6F] px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#2C6E61]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>
                </div>
            </div>

            <main className="pt-28 lg:pt-36">
                {/* ── 1. HERO ──────────────────────────────────────── */}
                <section className="px-6 pb-20 lg:px-12 lg:pb-28">
                    <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        {/* Copy */}
                        <div>
                            {/* Badge */}
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-1.5">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#29685B]" />
                                <span className="text-[13px] font-medium text-[#065F46]">
                                    {t(
                                        "Gap Engine — AI ανάλυση κενών κάλυψης",
                                        "Gap Engine — AI coverage gap analysis"
                                    )}
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="mb-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#0F172A] lg:text-[58px]">
                                {isGreek ? (
                                    <>
                                        Ξέρετε τι σας καλύπτει{" "}
                                        <span className="text-[#29685B]">κάθε ασφαλιστήριο</span>;
                                    </>
                                ) : (
                                    <>
                                        Do you know what each{" "}
                                        <span className="text-[#29685B]">policy covers</span>?
                                    </>
                                )}
                            </h1>

                            {/* Subheadline */}
                            <p className="mb-8 max-w-[500px] text-[18px] leading-relaxed text-[#475569]">
                                {t(
                                    "Ανεβάστε τα συμβόλαιά σας. Η AI βρίσκει κενά, σας ειδοποιεί πριν τη λήξη, και σας κρατά ασφαλισμένους.",
                                    "Upload your policies. AI finds gaps, alerts you before renewals, and keeps you fully protected."
                                )}
                            </p>

                            {/* CTAs */}
                            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/auth/signup?role=policyholder&source=landing_hero"
                                    onClick={() => trackCta("hero")}
                                    className="rounded-full bg-[#29685B] px-7 py-3.5 text-center text-[15px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
                                >
                                    {t("Ξεκινήστε Δωρεάν", "Start Free")}
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="rounded-full border border-[#E2E8F0] bg-white px-7 py-3.5 text-center text-[15px] font-bold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                                >
                                    {t("Πώς λειτουργεί", "How it works")}
                                </Link>
                            </div>

                            {/* Product facts — verifiable claims only, no fabricated social proof */}
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#29685B] text-[10px] font-bold text-white">
                                    20
                                </div>
                                <p className="text-[13px] text-[#64748B]">
                                    <span className="font-semibold text-[#0F172A]">
                                        {t("ασφαλιστικοί κλάδοι", "insurance branches")}
                                    </span>{" "}
                                    {t(
                                        "— δωρεάν 1 συμβόλαιο με βασική AI σύνοψη, χωρίς κάρτα",
                                        "— 1 policy free with a basic AI summary, no card required"
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Widget */}
                        <PolicyWalletWidget isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 2. TRUST BAR ─────────────────────────────────── */}
                <div className="border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-10 lg:px-12">
                    <div className="mx-auto max-w-[1240px] space-y-6 text-center">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-[#64748B]">
                            {t(
                                "Αναγνωρίζει συμβόλαια από όλες τις ασφαλιστικές",
                                "Works with every Greek insurer"
                            )}
                        </p>
                        <TrustBadges />
                        <TrustStrip
                            items={[
                                { kind: "encryption", label: "AES-256" },
                                { kind: "eu", label: t("Servers ΕΕ", "EU Servers") },
                                { kind: "gdpr", label: "GDPR" },
                            ]}
                        />
                    </div>
                </div>

                {/* ── 3. SERVICES ──────────────────────────────────── */}
                <section id="services" className="px-6 py-20 lg:px-12 lg:py-28">
                    <div className="mx-auto max-w-[1240px]">
                        <div className="mb-12 max-w-[560px]">
                            <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Υπηρεσίες", "Services")}
                            </p>
                            <h2 className="mb-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-[42px]">
                                {t(
                                    "Ό,τι χρειάζεστε για τα ασφαλιστήριά σας",
                                    "Everything you need for your policies"
                                )}
                            </h2>
                            <p className="text-[17px] leading-relaxed text-[#475569]">
                                {t(
                                    "Από το upload μέχρι την ανάλυση AI — το PolicyWallet αυτοματοποιεί κάθε βήμα.",
                                    "From upload to AI analysis — PolicyWallet automates every step."
                                )}
                            </p>
                        </div>
                        <ServicesGrid isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 4. AUDIENCE TABS ─────────────────────────────── */}
                <section id="solutions" className="bg-[#F8FAFC] px-6 py-20 lg:px-12 lg:py-28">
                    <div className="mx-auto max-w-[1240px]">
                        <div className="mb-12 text-center">
                            <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Για εσάς", "For you")}
                            </p>
                            <h2 className="mb-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-[42px]">
                                {t("Ιδιώτης ή ασφαλιστής;", "Individual or insurance agent?")}
                            </h2>
                            <p className="mx-auto max-w-[500px] text-[17px] leading-relaxed text-[#475569]">
                                {t(
                                    "Δύο διαφορετικές εμπειρίες, σχεδιασμένες για τις ανάγκες σας.",
                                    "Two distinct experiences, built around your needs."
                                )}
                            </p>
                        </div>
                        <AudienceTabs isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 4b. PARTNER PERKS (renders only with live partners) ── */}
                <PartnerPerksSection offers={partnerOffers} isGreek={isGreek} />

                {/* ── 5. STATS ─────────────────────────────────────── */}
                <section className="border-y border-[#E2E8F0] px-6 py-16 lg:px-12">
                    <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-8 text-center lg:grid-cols-4">
                        {[
                            {
                                value: "20",
                                labelEl: "Ασφαλιστικοί κλάδοι",
                                labelEn: "Insurance branches",
                            },
                            {
                                value: "€0",
                                labelEl: "Δωρεάν συμβόλαιο με βασική AI σύνοψη",
                                labelEn: "Free policy with basic AI summary",
                            },
                            {
                                value: "<30s",
                                labelEl: "Χρόνος ανάλυσης",
                                labelEn: "Analysis time",
                            },
                            {
                                value: "GDPR",
                                labelEl: "Πλήρης συμμόρφωση",
                                labelEn: "Fully compliant",
                            },
                        ].map((stat) => (
                            <div key={stat.value}>
                                <p className="text-[36px] font-bold tracking-tight text-[#29685B] lg:text-[44px]">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-[14px] text-[#64748B]">
                                    {t(stat.labelEl, stat.labelEn)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 6. HOW IT WORKS ──────────────────────────────── */}
                <section id="how-it-works" className="px-6 py-20 lg:px-12 lg:py-28">
                    <div className="mx-auto max-w-[1240px]">
                        <div className="mb-14 text-center">
                            <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Πώς λειτουργεί", "How it works")}
                            </p>
                            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-[42px]">
                                {t("Τρία βήματα. Πλήρης έλεγχος.", "Three steps. Full control.")}
                            </h2>
                        </div>

                        <div className="flex flex-col gap-8 md:flex-row md:gap-0">
                            {[
                                {
                                    Icon: Upload,
                                    step: "01",
                                    titleEl: "Ανεβάστε",
                                    titleEn: "Upload",
                                    descEl: "PDF ή φωτογραφία, οποιαδήποτε εταιρεία. Δεν χρειάζεται ειδική μορφή.",
                                    descEn: "PDF or photo, any insurer. No special format required.",
                                },
                                {
                                    Icon: Sparkles,
                                    step: "02",
                                    titleEl: "Η AI αναλύει",
                                    titleEn: "AI analyzes",
                                    descEl: "Εξάγει δεδομένα, συγκρίνει καλύψεις και εντοπίζει κενά σε δευτερόλεπτα.",
                                    descEn: "Extracts data, compares coverage and detects gaps in seconds.",
                                },
                                {
                                    Icon: CheckCircle,
                                    step: "03",
                                    titleEl: "Πάρτε τον έλεγχο",
                                    titleEn: "Take control",
                                    descEl: "Dashboard, ειδοποιήσεις ανανέωσης και σύνδεση με τον σύμβουλό σας.",
                                    descEn: "Dashboard, renewal alerts and direct connection with your advisor.",
                                },
                            ].map((item, i, arr) => (
                                <div key={item.step} className="flex flex-1 items-start md:flex-col">
                                    <div className="flex flex-col items-center md:flex-row md:items-start md:w-full">
                                        <div className="flex flex-col items-center md:flex-1">
                                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF5] md:mb-6">
                                                <item.Icon className="h-6 w-6 text-[#29685B]" />
                                            </div>
                                            <div className="ml-5 md:ml-0 md:text-center">
                                                <p className="mb-0.5 text-[11px] font-bold tracking-widest text-[#29685B]">
                                                    {item.step}
                                                </p>
                                                <h3 className="mb-2 text-[18px] font-semibold text-[#0F172A]">
                                                    {t(item.titleEl, item.titleEn)}
                                                </h3>
                                                <p className="text-[14px] leading-relaxed text-[#475569] md:max-w-[220px]">
                                                    {t(item.descEl, item.descEn)}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Connector arrow (desktop only, between steps) */}
                                        {i < arr.length - 1 && (
                                            <div className="hidden items-center px-6 pt-7 md:flex">
                                                <ArrowRight className="h-5 w-5 text-[#CBD5E1]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 7. FINAL CTA ─────────────────────────────────── */}
                <section className="px-6 pb-24 lg:px-12">
                    <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-3xl bg-[#0F172A] px-8 py-20 text-center lg:py-28">
                        {/* Radial glow */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(41,104,91,0.30),transparent)]" />

                        <div className="relative">
                            <p className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-[#4ADE80]">
                                PolicyWallet
                            </p>
                            <h2 className="mb-4 text-[32px] font-semibold leading-tight tracking-[-0.03em] text-white lg:text-[48px]">
                                {isGreek ? (
                                    <>
                                        Αρκεί ένα συμβόλαιο
                                        <br />
                                        για να δείτε τη διαφορά.
                                    </>
                                ) : (
                                    <>
                                        One policy is all it takes
                                        <br />
                                        to see the difference.
                                    </>
                                )}
                            </h2>
                            <p className="mx-auto mb-10 max-w-[440px] text-[17px] text-white/65">
                                {t(
                                    "Δωρεάν για 1 συμβόλαιο με βασική AI σύνοψη. Χωρίς πιστωτική κάρτα.",
                                    "Free for 1 policy with a basic AI summary. No credit card required."
                                )}
                            </p>
                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <Link
                                    href="/auth/signup?role=policyholder&source=landing_cta"
                                    onClick={() => trackCta("final_cta")}
                                    className="rounded-full bg-white px-8 py-3.5 text-[15px] font-bold text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
                                >
                                    {t("Ξεκινήστε Δωρεάν", "Start Free")}
                                </Link>
                                <Link
                                    href="/solutions/agents"
                                    className="rounded-full border border-white/20 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
                                >
                                    {t("Είστε ασφαλιστής;", "Are you an agent?")}
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <PublicMegaFooter locale={locale} />
        </div>
    )
}
