import { Inter } from "next/font/google"
import Link from "next/link"
import { ArrowRight, Upload, Sparkles, CheckCircle } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingCtaLink } from "@/components/landing/LandingCtaLink"
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

/**
 * Server component. Every static section (hero copy, trust bar, services,
 * stats, how-it-works, final CTA) renders on the server; the only client
 * islands are LandingHeader (nav/mobile-menu state + analytics),
 * LandingCtaLink (tracked signup CTAs), PolicyWalletWidget, AudienceTabs
 * and PublicMegaFooter (newsletter form).
 */
export function WorldClassLanding({ locale, partnerOffers = [] }: WorldClassLandingProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    // EN context navigates within the /en tree (unmirrored targets stay Greek).
    const l = (href: string) => localizeHref(href, locale)

    return (
        <div
            className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#29685B]/20 selection:text-[#0F172A]`}
        >
            <LandingHeader locale={locale} showPerksLink={partnerOffers.length > 0} />

            <main id="main-content" tabIndex={-1} className="pt-28 lg:pt-36">
                {/* ── 1. HERO ──────────────────────────────────────── */}
                <section className="px-6 pb-20 lg:px-12 lg:pb-28">
                    <div className="mx-auto grid max-w-page grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        {/* Copy */}
                        <div>
                            {/* Badge */}
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-1.5">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#29685B]" />
                                <span className="text-body-sm font-medium text-[#166534]">
                                    {t(
                                        "Gap Engine — AI ανάλυση κενών κάλυψης",
                                        "Gap Engine — AI coverage gap analysis"
                                    )}
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-[-0.04em] text-[#0F172A] lg:text-display">
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
                            <p className="mb-8 max-w-[500px] text-lead leading-relaxed text-[#475569]">
                                {t(
                                    "Ανεβάστε τα ασφαλιστήριά σας. Η AI βρίσκει κενά, σας ειδοποιεί πριν τη λήξη, και σας δίνει καθαρή εικόνα της κάλυψής σας.",
                                    "Upload your policies. AI finds gaps, alerts you before renewals, and keeps your cover in clear view."
                                )}
                            </p>

                            {/* CTAs */}
                            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                                <LandingCtaLink
                                    href="/auth/signup?role=policyholder&source=landing_hero"
                                    locale={locale}
                                    location="hero"
                                    className="pw-primary-button pw-btn-lg"
                                >
                                    {t("Ξεκινήστε Δωρεάν", "Start Free")}
                                </LandingCtaLink>
                                <Link href="#how-it-works" className="pw-secondary-button pw-btn-lg">
                                    {t("Πώς λειτουργεί", "How it works")}
                                </Link>
                            </div>

                            {/* Product facts — verifiable claims only, no fabricated social proof */}
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#29685B] text-kicker font-bold text-white">
                                    20
                                </div>
                                <p className="text-body-sm text-[#5B6A7A]">
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
                    <div className="mx-auto max-w-page space-y-6 text-center">
                        <p className="text-caption font-semibold uppercase tracking-widest text-[#5B6A7A]">
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
                    <div className="mx-auto max-w-page">
                        <div className="mb-12 max-w-[560px]">
                            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Υπηρεσίες", "Services")}
                            </p>
                            <h2 className="mb-4 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1">
                                {t(
                                    "Ό,τι χρειάζεστε για τα ασφαλιστήριά σας",
                                    "Everything you need for your policies"
                                )}
                            </h2>
                            <p className="text-lead leading-relaxed text-[#475569]">
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
                    <div className="mx-auto max-w-page">
                        <div className="mb-12 text-center">
                            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Για εσάς", "For you")}
                            </p>
                            <h2 className="mb-4 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1">
                                {t("Ιδιώτης ή ασφαλιστής;", "Individual or insurance agent?")}
                            </h2>
                            <p className="mx-auto max-w-[500px] text-lead leading-relaxed text-[#475569]">
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
                    <div className="mx-auto grid max-w-page grid-cols-2 gap-8 text-center lg:grid-cols-4">
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
                                <p className="text-h2 font-bold tracking-tight text-[#29685B] lg:text-h1">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-body text-[#5B6A7A]">
                                    {t(stat.labelEl, stat.labelEn)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 6. HOW IT WORKS ──────────────────────────────── */}
                <section id="how-it-works" className="px-6 py-20 lg:px-12 lg:py-28">
                    <div className="mx-auto max-w-page">
                        <div className="mb-14 text-center">
                            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Πώς λειτουργεί", "How it works")}
                            </p>
                            <h2 className="text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1">
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
                                                <p className="mb-0.5 text-micro font-bold tracking-widest text-[#29685B]">
                                                    {item.step}
                                                </p>
                                                <h3 className="mb-2 text-lead font-semibold text-[#0F172A]">
                                                    {t(item.titleEl, item.titleEn)}
                                                </h3>
                                                <p className="text-body leading-relaxed text-[#475569] md:max-w-[220px]">
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
                    <div className="relative mx-auto max-w-page overflow-hidden rounded-2xl bg-[#0F172A] px-8 py-20 text-center lg:py-28">
                        {/* Radial glow */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(41,104,91,0.30),transparent)]" />

                        <div className="relative">
                            <p className="mb-4 text-caption font-semibold uppercase tracking-widest text-[#89D9B2]">
                                PolicyWallet
                            </p>
                            <h2 className="mb-4 text-h2 font-semibold leading-tight tracking-[-0.03em] text-white lg:text-h1">
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
                            <p className="mx-auto mb-10 max-w-[440px] text-lead text-white/80">
                                {t(
                                    "Δωρεάν για 1 συμβόλαιο με βασική AI σύνοψη. Χωρίς πιστωτική κάρτα.",
                                    "Free for 1 policy with a basic AI summary. No credit card required."
                                )}
                            </p>
                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <LandingCtaLink
                                    href="/auth/signup?role=policyholder&source=landing_cta"
                                    locale={locale}
                                    location="final_cta"
                                    className="pw-primary-button-inverse pw-btn-lg"
                                >
                                    {t("Ξεκινήστε Δωρεάν", "Start Free")}
                                </LandingCtaLink>
                                <Link
                                    href={l("/solutions/agents")}
                                    className="pw-secondary-button-inverse pw-btn-lg"
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
