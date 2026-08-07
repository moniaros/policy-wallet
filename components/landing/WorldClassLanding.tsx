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
import { CATEGORY, CTA_REASSURANCE, PRIMARY_ACTION, PROMISE, pick } from "@/lib/marketing/positioning"

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
 * protected — and the first screen answers all four questions a visitor is
 * asking, with the visitor doing three of the four:
 *
 *   why you      → the badge, expanded in #difference
 *   what changed → the headline, answered by the chips they pick
 *   why care     → the effect their own pick reveals, expanded in #why-now
 *   what now     → the button under it
 *
 * Everything that is us talking about ourselves comes after that: what you get,
 * how it works, who it is for, whether you can trust us, what it costs.
 *
 * Server component. Every section renders on the server; the only client
 * islands are LandingHeader (nav state + analytics), LandingCtaLink (tracked
 * signup CTAs), LifeChangeDiscovery, PolicyWalletWidget, AudienceTabs and
 * PublicMegaFooter.
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

            {/* The floating header ends at 72px, so pt-20 clears it with room to
                spare. The old pt-24 left 24px of nothing on phones — cheap to
                give back now that the first screen has to hold an interaction. */}
            <main id="main-content" tabIndex={-1} className="pt-20 sm:pt-28 lg:pt-36">
                {/* ── 1. HERO ──────────────────────────────────────── */}
                {/* The first screen IS the product. Badge, headline, then the
                    visitor's own answer — nothing between arriving and doing.
                    What used to sit here (a paragraph restating the story, and
                    the security row) moved down: both were us talking, and both
                    pushed the one interactive thing below the fold. */}
                <section className="px-6 pb-16 lg:px-12 lg:pb-24">
                    <div className="mx-auto grid max-w-page grid-cols-1 items-start gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
                        <div>
                            {/* What we are, in the words a person would use. The
                                formal category name still carries the SEO/AEO
                                job in the footer, the OG cards and the JSON-LD
                                entity — it is just not what a human reads first.
                                Rounds on mobile because a sentence wraps. */}
                            <p className="mb-4 inline-flex max-w-full items-start gap-2 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 sm:mb-6 sm:rounded-full sm:px-3.5 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#29685B] dark:bg-[#A7F3D0]" />
                                <span className="text-caption font-semibold text-[#166534] sm:text-body-sm dark:text-[#A7F3D0]">
                                    {pick(CATEGORY, locale)}
                                </span>
                            </p>

                            <h1 className="text-h2 leading-[1.05] font-semibold tracking-[-0.04em] text-balance text-[#0F172A] sm:text-h1 lg:text-display dark:text-white">
                                {pick(PROMISE.lead, locale)}{" "}
                                <span className="text-[#29685B] dark:text-[#A7F3D0]">
                                    {pick(PROMISE.accent, locale)}
                                </span>
                            </h1>

                            {/* The answer to the headline, given by the visitor. */}
                            <LifeChangeDiscovery locale={locale} />

                            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
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
                        </div>

                        {/* Desktop only. On a phone the mock would take the
                            whole first screen and push the interaction under
                            it — the exact problem this layout removes. */}
                        <div className="hidden lg:block">
                            <PolicyWalletWidget isGreek={isGreek} />
                        </div>
                    </div>
                </section>

                {/* ── 2. WHY WE ARE DIFFERENT ──────────────────────── */}
                <WhyDifferent locale={locale} />

                {/* ── 3. WHAT YOU GET ──────────────────────────────── */}
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

                {/* ── 4. WHY IT MATTERS ────────────────────────────── */}
                <WhyNow locale={locale} />

                {/* ── 5. HOW IT WORKS ──────────────────────────────── */}
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

                {/* ── 6. WHO IT IS FOR ─────────────────────────────── */}
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

                {/* ── 6b. PARTNER PERKS (renders only with live partners) ── */}
                <PartnerPerksSection offers={partnerOffers} isGreek={isGreek} />

                {/* ── 7. WILL IT WORK FOR ME, AND CAN I TRUST YOU ───── */}
                {/* TrustRow used to sit in the hero. Encryption and data
                    residency are what every SaaS claims, so leading with them
                    proved nothing and cost the fold. They belong here, next to
                    the other "is this for real" evidence, once the visitor has
                    a reason to care. */}
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
                        <div className="mx-auto max-w-[640px] border-t border-[#E2E8F0] pt-6 text-left dark:border-slate-800">
                            <TrustRow locale={locale} />
                        </div>
                    </div>
                </section>

                {/* ── 8. QUESTIONS ─────────────────────────────────── */}
                <HomeFaq locale={locale} />

                {/* ── 9. PRICE ────────────────────────────────────── */}
                {/* After the questions, not before them: nobody weighs a
                    subscription while they are still deciding what this is. */}
                <PricingPreview locale={locale} plans={pricingPlans} />

                {/* ── 10. WHAT TO DO NEXT ──────────────────────────── */}
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
