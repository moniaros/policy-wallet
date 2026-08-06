import { Inter } from "next/font/google"
import Link from "next/link"
import { ArrowRight, FileText, Search, Sparkles } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingCtaLink } from "@/components/landing/LandingCtaLink"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { TrustBadges } from "@/components/landing/TrustBadges"
import { TrustRow } from "@/components/landing/TrustRow"
import { LifeChangeDiscovery } from "@/components/landing/LifeChangeDiscovery"
import { WhyDifferent } from "@/components/landing/WhyDifferent"
import { WhyNow } from "@/components/landing/WhyNow"
import { PricingPreview } from "@/components/landing/PricingPreview"
import { HomeFaq } from "@/components/landing/HomeFaq"
import { PartnerPerksSection } from "@/components/landing/PartnerPerksSection"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"
import type { PublicPricingPlan } from "@/lib/pricing/public-pricing-content"
import { PolicyWalletWidget } from "@/components/landing/PolicyWalletWidget"
import { ServicesGrid } from "@/components/landing/ServicesGrid"
import { AudienceTabs } from "@/components/landing/AudienceTabs"
import { landingContent } from "@/lib/landing/content"
import { productCategories } from "@/lib/product/catalog"
import {
    CATEGORY_NAME,
    CTA_REASSURANCE,
    LIFE_CHANGES,
    PRIMARY_ACTION,
    PROMISE,
    STORY,
    WHAT_WE_DO,
    pick,
} from "@/lib/marketing/positioning"

const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })

interface WorldClassLandingProps {
    locale: LandingLocale
    /** Live partner offers from getPublicPartnerOffers(); empty/omitted ⇒ the
     *  #perks section and its nav link render nothing (honesty rule). */
    partnerOffers?: PartnerOfferView[]
    /** Live policyholder plans from the same catalog /pricing renders, so the
     *  homepage price band can never quote a number the pricing page does not. */
    pricingPlans?: PublicPricingPlan[]
}

/**
 * The homepage. It tells one story, in order — life changes, your risks change
 * with it, your insurance does not keep up, we tell you whether you are still
 * protected — and the first screen already answers all four questions a
 * visitor is asking:
 *
 *   what changed → the headline, expanded in #life-changes
 *   why care     → the sentence under it, expanded in #why-now
 *   why you      → the badge above it, expanded in #difference
 *   what now     → the button, and the price band further down
 *
 * Server component. Every section renders on the server; the only client
 * islands are LandingHeader (nav state + analytics), LandingCtaLink (tracked
 * signup CTAs), PolicyWalletWidget, AudienceTabs and PublicMegaFooter.
 */
export function WorldClassLanding({
    locale,
    partnerOffers = [],
    pricingPlans = [],
}: WorldClassLandingProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    // EN context navigates within the /en tree (unmirrored targets stay Greek).
    const l = (href: string) => localizeHref(href, locale)

    const steps = landingContent.howItWorks.steps
    const stepIcons = [FileText, Search, Sparkles] as const

    return (
        <div
            className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#29685B]/20 selection:text-[#0F172A] dark:bg-slate-900 dark:text-white`}
        >
            <LandingHeader locale={locale} showPerksLink={partnerOffers.length > 0} />

            <main id="main-content" tabIndex={-1} className="pt-24 sm:pt-28 lg:pt-36">
                {/* ── 1. HERO ──────────────────────────────────────── */}
                <section className="px-6 pb-16 lg:px-12 lg:pb-24">
                    <div className="mx-auto grid max-w-page grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
                        <div>
                            {/* The category claim — the first thing on the page.
                                The H1 + subline directly below are its decode. */}
                            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 sm:mb-6 sm:px-3.5 sm:py-1.5 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#29685B] dark:bg-[#A7F3D0]" />
                                <span className="text-caption font-semibold text-[#166534] sm:text-body-sm dark:text-[#A7F3D0]">
                                    {pick(CATEGORY_NAME, locale)}
                                </span>
                            </p>

                            <h1 className="mb-4 text-h2 leading-[1.05] font-semibold tracking-[-0.04em] text-balance text-[#0F172A] sm:mb-6 sm:text-h1 lg:text-display dark:text-white">
                                {pick(PROMISE.lead, locale)}{" "}
                                <span className="text-[#29685B] dark:text-[#A7F3D0]">
                                    {pick(PROMISE.accent, locale)}
                                </span>
                            </h1>

                            <p className="mb-6 max-w-[520px] text-body-lg leading-relaxed text-[#475569] sm:mb-8 sm:text-lead dark:text-slate-300">
                                {pick(WHAT_WE_DO, locale)}
                            </p>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <LandingCtaLink
                                    href="/auth/signup?role=policyholder&source=landing_hero"
                                    locale={locale}
                                    location="hero"
                                    className="pw-primary-button pw-btn-lg"
                                >
                                    {pick(PRIMARY_ACTION, locale)}
                                    <ArrowRight aria-hidden className="h-4 w-4" />
                                </LandingCtaLink>
                                <Link href="#how-it-works" className="pw-secondary-button pw-btn-lg">
                                    {t("Πώς λειτουργεί", "How it works")}
                                </Link>
                            </div>

                            {/* Nothing to lose by starting today. */}
                            <p className="mt-3 text-body-sm text-[#5B6A7A] sm:mt-4 dark:text-slate-400">
                                {pick(CTA_REASSURANCE, locale)}
                            </p>

                            {/* Why you can trust us — answered without scrolling. */}
                            <div className="mt-5 border-t border-[#E2E8F0] pt-5 sm:mt-8 sm:pt-7 dark:border-slate-800">
                                <TrustRow locale={locale} />
                            </div>
                        </div>

                        <PolicyWalletWidget isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 2. WHAT CHANGED ──────────────────────────────── */}
                {/* Interactive: the visitor picks their own changes and reads
                    what each one does to their cover. Every line is in the
                    server HTML, so this section still argues its case with
                    JavaScript off. */}
                <LifeChangeDiscovery locale={locale} />

                {/* ── 3. WHY WE ARE DIFFERENT ──────────────────────── */}
                <WhyDifferent locale={locale} />

                {/* ── 4. WHAT YOU GET ──────────────────────────────── */}
                <section
                    id="services"
                    aria-labelledby="services-heading"
                    className="scroll-mt-28 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28"
                >
                    <div className="mx-auto max-w-page">
                        <div className="mb-12 max-w-[600px]">
                            <p className="mb-3 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                                {t("Τι παίρνετε", "What you get")}
                            </p>
                            <h2
                                id="services-heading"
                                className="mb-4 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h1 dark:text-white"
                            >
                                {t(
                                    "Πέντε απαντήσεις που δεν σας δίνει κανείς άλλος.",
                                    "Five answers nobody else gives you.",
                                )}
                            </h2>
                            <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    "Στείλτε ένα συμβόλαιο. Τα υπόλοιπα τα κάνουμε εμείς.",
                                    "Send us one policy. We do the rest.",
                                )}
                            </p>
                        </div>
                        <ServicesGrid isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 5. WHY IT MATTERS ────────────────────────────── */}
                <WhyNow locale={locale} />

                {/* ── 6. HOW IT WORKS ──────────────────────────────── */}
                <section
                    id="how-it-works"
                    aria-labelledby="how-it-works-heading"
                    className="scroll-mt-28 border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
                >
                    <div className="mx-auto max-w-page">
                        <div className="mb-14 text-center">
                            <p className="mb-3 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                                {t("Πώς λειτουργεί", "How it works")}
                            </p>
                            <h2
                                id="how-it-works-heading"
                                className="text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h1 dark:text-white"
                            >
                                {t("Τρία βήματα. Λίγα λεπτά.", "Three steps. A few minutes.")}
                            </h2>
                        </div>

                        <ol className="grid gap-6 md:grid-cols-3">
                            {steps.map((step, index) => {
                                const Icon = stepIcons[index] ?? FileText
                                return (
                                    <li
                                        key={step.id}
                                        className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-7 dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <div className="mb-5 flex items-center gap-3">
                                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] dark:bg-[#29685B]/20">
                                                <Icon aria-hidden className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                            </span>
                                            <span className="text-micro font-bold tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                                                {String(index + 1).padStart(2, "0")}
                                            </span>
                                        </div>
                                        <h3 className="mb-2 text-lead font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                            {isGreek ? step.title.el : step.title.en}
                                        </h3>
                                        <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                            {isGreek ? step.description.el : step.description.en}
                                        </p>
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                </section>

                {/* ── 7. WHO IT IS FOR ─────────────────────────────── */}
                <section
                    id="solutions"
                    aria-labelledby="solutions-heading"
                    className="scroll-mt-28 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28"
                >
                    <div className="mx-auto max-w-page">
                        <div className="mb-12 text-center">
                            <p className="mb-3 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                                {t("Για ποιον", "Who it is for")}
                            </p>
                            <h2
                                id="solutions-heading"
                                className="mb-4 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h1 dark:text-white"
                            >
                                {t("Ασφαλισμένος ή ασφαλιστής;", "Are you insured, or do you insure others?")}
                            </h2>
                            <p className="mx-auto max-w-[520px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    "Δύο διαφορετικές εμπειρίες, φτιαγμένες για τη δουλειά που κάνετε.",
                                    "Two different experiences, built for the job you are doing.",
                                )}
                            </p>
                        </div>
                        <AudienceTabs isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 7b. PARTNER PERKS (renders only with live partners) ── */}
                <PartnerPerksSection offers={partnerOffers} isGreek={isGreek} />

                {/* ── 8. PRICE ─────────────────────────────────────── */}
                <PricingPreview locale={locale} plans={pricingPlans} />

                {/* ── 9. WILL IT WORK FOR ME ───────────────────────── */}
                <section
                    aria-labelledby="coverage-heading"
                    className="border-t border-[#E2E8F0] px-6 py-14 lg:px-12 dark:border-slate-800"
                >
                    <div className="mx-auto max-w-page space-y-5 text-center">
                        <h2
                            id="coverage-heading"
                            className="text-lead font-semibold text-balance text-[#0F172A] sm:text-title dark:text-white"
                        >
                            {t(
                                "Δουλεύει με ό,τι κι αν έχετε, από όποια εταιρεία κι αν το πήρατε.",
                                "It works with whatever you have, from whichever company you bought it.",
                            )}
                        </h2>
                        <TrustBadges isGreek={isGreek} />
                        <p className="mx-auto max-w-[560px] text-body-sm text-[#5B6A7A] dark:text-slate-400">
                            {t(
                                `${productCategories.length} είδη ασφάλισης. Δεν συνεργαζόμαστε με καμία ασφαλιστική — γι' αυτό μπορούμε να σας πούμε την αλήθεια.`,
                                `${productCategories.length} types of insurance. We do not work with any insurance company — that is why we can tell you the truth.`,
                            )}
                        </p>
                    </div>
                </section>

                {/* ── 10. QUESTIONS ────────────────────────────────── */}
                <HomeFaq locale={locale} />

                {/* ── 11. WHAT TO DO NEXT ──────────────────────────── */}
                <section className="px-6 pb-24 lg:px-12">
                    <div className="relative mx-auto max-w-page overflow-hidden rounded-2xl bg-[#0F172A] px-6 py-20 text-center sm:px-8 lg:py-28">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(41,104,91,0.30),transparent)]" />

                        <div className="relative">
                            <p className="mb-4 text-caption font-semibold tracking-widest uppercase text-[#89D9B2]">
                                PolicyWallet
                            </p>
                            <h2 className="mb-4 text-h2 leading-tight font-semibold tracking-[-0.03em] text-balance text-white lg:text-h1">
                                {t(
                                    "Μάθετε σήμερα αν είστε ακόμη προστατευμένοι.",
                                    "Find out today whether you are still protected.",
                                )}
                            </h2>
                            <p className="mx-auto mb-10 max-w-[460px] text-lead text-white/80">
                                {pick(CTA_REASSURANCE, locale)}
                            </p>
                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <LandingCtaLink
                                    href="/auth/signup?role=policyholder&source=landing_cta"
                                    locale={locale}
                                    location="final_cta"
                                    className="pw-primary-button-inverse pw-btn-lg"
                                >
                                    {pick(PRIMARY_ACTION, locale)}
                                    <ArrowRight aria-hidden className="h-4 w-4" />
                                </LandingCtaLink>
                                <Link
                                    href={l("/solutions/agents")}
                                    className="pw-secondary-button-inverse pw-btn-lg"
                                >
                                    {t("Είμαι ασφαλιστής", "I am an insurance agent")}
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
