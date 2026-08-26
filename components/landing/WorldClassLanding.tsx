import { Inter } from "next/font/google"
import Link from "next/link"
import { ArrowRight, FileText, Search, Sparkles } from "lucide-react"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingCtaLink } from "@/components/landing/LandingCtaLink"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { TrustBadges } from "@/components/landing/TrustBadges"
import { TrustRow } from "@/components/landing/TrustRow"
import { WhyDifferent } from "@/components/landing/WhyDifferent"
import { WhyNow } from "@/components/landing/WhyNow"
import { ClearLimits } from "@/components/landing/ClearLimits"
import { HomeContact } from "@/components/landing/HomeContact"
import { HookTicker } from "@/components/growth/HookTicker"
import { HeroSlides } from "@/components/landing/HeroSlides"
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
import { CATEGORY, CTA_REASSURANCE, PRIMARY_ACTION, PROMISE, STORY, pick } from "@/lib/marketing/positioning"

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
            {/* The header floats 16px from the top and is 56px tall, so the
                browser's scroll-on-focus could park a focused control right
                underneath it — the ring simply vanished, which a keyboard user
                cannot tell apart from focus being lost (WCAG 2.2 SC 2.4.11).
                Reproduced by tabbing deep into the page and reversing out.
                Scoped to this page's main content: one rule for every focusable
                rather than a patch per component, since the next section added
                would have the same problem. `:where()` keeps specificity at 0
                so nothing here overrides a component's own scroll-margin. */}
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        "#main-content :where(a,button,input,select,textarea,summary,[tabindex])" +
                        "{scroll-margin-top:88px;scroll-margin-bottom:24px}",
                }}
            />

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
                <section className="px-6 pb-20 lg:px-12 lg:pb-28">
                    <div className="mx-auto max-w-[820px] text-center">
                        {/* What we are, in the words a person would use. The
                            formal category name still carries the SEO/AEO job in
                            the footer, the OG cards and the JSON-LD entity — it
                            is just not what a human reads first. */}
                        <p className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-1.5 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#29685B] dark:bg-[#A7F3D0]" />
                            <span className="text-caption font-semibold text-[#166534] sm:text-body-sm dark:text-[#A7F3D0]">
                                {pick(CATEGORY, locale)}
                            </span>
                        </p>

                        {/* Three angles on the same argument, taken from
                            /compare. ONLY the headline and lead rotate — the
                            chip above and everything below stays put, so the
                            primary action never moves under a cursor. */}
                        <HeroSlides locale={locale} />

                        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <LandingCtaLink
                                href={authHref("/auth/signup?role=policyholder&source=landing_hero", locale)}
                                locale={locale}
                                location="hero"
                                className="pw-primary-button pw-btn-lg"
                            >
                                {pick(PRIMARY_ACTION, locale)}
                                <ArrowRight aria-hidden className="h-4 w-4" />
                            </LandingCtaLink>
                            {/* The second action is now the ungated tool rather
                                than a jump link. Someone who is not ready to
                                hand over an email can still get something out of
                                the site, which is the whole reason /needs was
                                built. */}
                            <Link href={l("/needs")} className="pw-secondary-button pw-btn-lg">
                                {t("Έλεγχος αναγκών σε 6 βήματα", "Needs check in 6 steps")}
                            </Link>
                        </div>

                        {/* What the paid product actually does, directly under
                            the action. The free tier is real and still stated
                            below — but it is the floor, not the offer, and
                            leading with it sold the floor. No price here: the
                            plan catalog is admin-managed and PricingPreview
                            renders the live figures a few sections down. */}
                        <p className="mx-auto mt-5 max-w-[540px] text-body-lg font-medium leading-relaxed text-[#334155] dark:text-slate-200">
                            {t(
                                "Με το Family διαβάζουμε κάθε ασφαλιστήριό σας, βρίσκουμε τι δεν καλύπτεται και σας ειδοποιούμε πριν λήξει κάτι.",
                                "With Family we read every one of your policies, find what is not covered, and warn you before something runs out.",
                            )}
                        </p>

                        {/* The free tier, kept accurate and kept findable, in the
                            size it earns. */}
                        <p className="mt-4 text-micro text-[#5B6A7A] dark:text-slate-400">
                            {pick(CTA_REASSURANCE, locale)}
                        </p>
                    </div>
                </section>

                {/* ── 2. WHY IT MATTERS ────────────────────────────── */}
                <WhyNow locale={locale} />

                {/* ── 3. WHAT YOU GET ──────────────────────────────── */}
                <section
                    id="services"
                    aria-labelledby="services-heading"
                    className="scroll-mt-28 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28"
                >
                    <div className="mx-auto max-w-page">
                        <div className="mb-12 max-w-[680px]">
                            <p className="mb-3 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                                {t("Τι παίρνετε", "What you get")}
                            </p>
                            <h2
                                id="services-heading"
                                className="mb-4 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h1 dark:text-white"
                            >
                                {/* The Greek used to say something else entirely —
                                    "Αναλυτικές αναφορές σε γλώσσα που δεν χρειαζεται
                                    να εισαι ασφαλιστής για να καταλάβεις" — in the
                                    informal singular, with «χρειάζεται» and «είστε»
                                    both missing their accents, and no full stop.
                                    Counted across all 126 sitemap pages, those were
                                    the ONLY informal-singular forms on the entire
                                    Greek surface. Five, because ServicesGrid renders
                                    exactly five cards. */}
                                {t(
                                    "Πέντε πράγματα για το τι ακριβώς αγοράσατε.",
                                    "Five things about exactly what you bought.",
                                )}
                            </h2>
                            <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                                {/* The Greek was missing the English lead's first
                                    sentence, which is the one that says what the
                                    five cards are actually about. */}
                                {t(
                                    "Μαζί με τα ψιλά γράμματα — όχι με ό,τι νομίζετε ότι αγοράσατε. Και ρωτήστε ό,τι θέλετε για το ασφαλιστήριό σας, όποια ώρα της ημέρας, με το Family.",
                                    "Including the small print — not what you think you bought. And ask anything about your policy, at any hour of the day, with Family.",
                                )}
                            </p>
                        </div>
                        <ServicesGrid isGreek={isGreek} />
                    </div>
                </section>

                {/* ── 4. WHAT IT WORKS WITH ─────────────────────────── */}
                {/* TrustRow used to sit in the hero. Encryption and data
                    residency are what every SaaS claims, so leading with them
                    proved nothing and cost the fold. They belong here, next to
                    the other "is this for real" evidence, once the visitor has
                    a reason to care. */}
                <section
                    aria-labelledby="coverage-heading"
                    className="px-6 py-20 lg:px-12 lg:py-28"
                >
                    {/* A stated panel rather than a thin strip wedged between two
                        bands. It carries the widest promise on the page — every
                        insurer, every branch — and it was set at `text-lead` in
                        14px of padding, which read as a footnote. The green wash
                        and mint edge are the brand's own emphasis surface, used
                        here at full width; no shadow, because the design system
                        keeps depth as a response to interaction and not as
                        decoration. */}
                    <div className="mx-auto max-w-[900px] space-y-7 rounded-3xl border border-[#A7F3D0] bg-[#ECFDF5] px-6 py-14 text-center sm:px-12 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                        <h2
                            id="coverage-heading"
                            className="mx-auto max-w-[720px] text-h3 font-semibold leading-[1.15] tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h2 dark:text-white"
                        >
                            {t(
                                "Δουλεύει με ό,τι κι αν έχετε, από όποια εταιρεία κι αν το πήρατε.",
                                "It works with whatever you have, from whichever company you bought it.",
                            )}
                        </h2>
                        <TrustBadges isGreek={isGreek} />
                        <p className="mx-auto max-w-[620px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-300">
                            {t(
                                `${productCategories.length} είδη ασφάλισης. Δεν συνεργαζόμαστε με καμία ασφαλιστική — γι' αυτό μπορούμε να σας πούμε την αλήθεια.`,
                                `${productCategories.length} types of insurance. We do not work with any insurance company — that is why we can tell you the truth.`,
                            )}
                        </p>
                        <div className="mx-auto max-w-[640px] border-t border-[#A7F3D0]/70 pt-7 text-left dark:border-[#29685B]/50">
                            <TrustRow locale={locale} />
                        </div>
                    </div>
                </section>

                {/* ── 5. OUR APPROACH ──────────────────────────────── */}
                <WhyDifferent locale={locale} />

                {/* The product shot, once, where it is evidence for the claim
                    just made rather than decoration beside a headline. */}

                {/* ── 6. HOW IT WORKS ──────────────────────────────── */}
                <section
                    id="how-it-works"
                    aria-labelledby="how-it-works-heading"
                    className="scroll-mt-28 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28"
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

                        <ol className="mx-auto max-w-[760px] divide-y divide-[#E2E8F0] dark:divide-slate-800">
                            {steps.map((step, index) => {
                                const Icon = stepIcons[index] ?? FileText
                                return (
                                    <li key={step.id} className="flex gap-5 py-7">
                                        {/* Was a bordered card in a 3-up grid —
                                            the page's default container, used
                                            five times over. A numbered row needs
                                            no box to read as a step. */}
                                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] dark:bg-[#29685B]/20">
                                            <Icon aria-hidden className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                        </span>
                                        <div>
                                        <h3 className="mb-2 text-lead font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                            {isGreek ? step.title.el : step.title.en}
                                        </h3>
                                        <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                            {isGreek ? step.description.el : step.description.en}
                                        </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                </section>

                {/* ── 6b. CLEAR LIMITS ─────────────────────────────── */}
                <ClearLimits locale={locale} />

                {/* ── 6c. GROWTH HOOKS ─────────────────────────────── */}
                {/* STATIC, deliberately: HeroSlides already rotates on this
                    page and a second rotator is forbidden (D-G05). The same
                    component rotates on /guides, where no rotator exists.
                    Copy comes from the hook register, never from here. */}
                <div className="px-6 py-16 lg:px-12 lg:py-20">
                    <HookTicker locale={locale} mode="static" className="mx-auto max-w-[760px]" />
                </div>

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

                {/* ── 8. QUESTIONS ─────────────────────────────────── */}
                <HomeFaq locale={locale} />

                {/* ── 9. PRICE ────────────────────────────────────── */}
                {/* After the questions, not before them: nobody weighs a
                    subscription while they are still deciding what this is. */}
                <PricingPreview locale={locale} plans={pricingPlans} />

                {/* ── 9b. CONTACT ──────────────────────────────────── */}
                <HomeContact locale={locale} />

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
                                    href={authHref("/auth/signup?role=policyholder&source=landing_cta", locale)}
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
