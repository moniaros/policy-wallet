import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
import { GrafiHero } from "@/components/landing/GrafiHero"
import { CoverageTicker } from "@/components/landing/grafi/CoverageTicker"
import { AnswerBlock } from "@/components/landing/grafi/AnswerBlock"
import { MarketNumbers } from "@/components/landing/grafi/MarketNumbers"
import { ComparisonBand } from "@/components/landing/grafi/ComparisonBand"
import { BrokerBand } from "@/components/landing/grafi/BrokerBand"
import { HowItWorks } from "@/components/landing/grafi/HowItWorks"
import { WhoItIsFor } from "@/components/landing/grafi/WhoItIsFor"
import { PricingPreview } from "@/components/landing/PricingPreview"
import { HomeFaq } from "@/components/landing/HomeFaq"
import { PartnerPerksSection } from "@/components/landing/PartnerPerksSection"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"
import type { PublicPricingPlan } from "@/lib/pricing/public-pricing-content"
import { PolicyWalletWidget } from "@/components/landing/PolicyWalletWidget"
import { ServicesGrid } from "@/components/landing/ServicesGrid"
import { productCategories } from "@/lib/product/catalog"
import { CATEGORY, CTA_REASSURANCE, NEUTRALITY_STATEMENT, PRIMARY_ACTION, PROMISE, STORY, pick } from "@/lib/marketing/positioning"

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

    return (
        <div
            className={`min-h-screen bg-white text-neutral-900 selection:bg-brand-green/20 selection:text-neutral-900 dark:bg-slate-900 dark:text-white`}
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
                {/* ── 1. HERO — Grafí. One fixed promise as the H1, the storage line as
                    the sub-head, product visible immediately. The rotating headline is
                    gone (see GrafiHero's docblock). */}
                <GrafiHero locale={locale} />

                

                {/* ── 2. COVERAGE-LINES TICKER (§6) — every line we read,
                    straight from the taxonomy-joined catalogue. */}
                <CoverageTicker locale={locale} />

              


                {/* ── 5. THE ANSWER BLOCK (§6) — one extractable paragraph
                    plus the four defined terms it leans on. */}
                <AnswerBlock locale={locale} />

                {/* ── 6. HOW IT WORKS (§6) — four numbered steps with per-step
                    arrows, the closing line, and the ReadingDemo, on Grafí. Copy
                    comes from lib/landing/content (also the HowTo JSON-LD). */}
                <HowItWorks locale={locale} />

                {/* ── 7. WHO IT IS FOR (§6) — the role switch, right after the
                    steps: once a visitor knows what happens to a policy, the
                    next question is whether this is for them. */}
                <WhoItIsFor locale={locale} />
                    
                   {/* ── 9b. WHY NOW (§6 institutions-band slot) — the three
                    why-now facts; the full institutions band lands with G8. */}
                <WhyNow locale={locale} />
  {/* ── 10. WHAT TO DO NEXT ──────────────────────────── */}
                <section className="px-6 pb-24 lg:px-12">
                    <div className="relative mx-auto max-w-page overflow-hidden rounded-2xl bg-[#0F172A] px-6 py-20 text-center sm:px-8 lg:py-28">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(41,104,91,0.30),transparent)]" />

                        <div className="relative">
                            <p className="mb-4 text-caption font-semibold tracking-widest uppercase text-mint">
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
                {/* ── 5a. MARKET NUMBERS (§6) — only the two claims that
                    resolve to a read primary source (ΕΔΑ, ΕΝΦΙΑ). */}
                <MarketNumbers locale={locale} />



                {/* ── 5b. OUR APPROACH ─────────────────────────────── */}
                <WhyDifferent locale={locale} />

                {/* The product shot, once, where it is evidence for the claim
                    just made rather than decoration beside a headline. */}

               

    

                {/* ── 6c. GROWTH HOOKS ─────────────────────────────── */}
                {/* STATIC, deliberately: HeroSlides already rotates on this
                    page and a second rotator is forbidden (D-G05). The same
                    component rotates on /guides, where no rotator exists.
                    Copy comes from the hook register, never from here. */}
                <div className="px-6 py-16 lg:px-12 lg:py-20">
                    <HookTicker locale={locale} mode="static" className="mx-auto max-w-[760px]" />
                </div>


              

                {/* ── 7b. PARTNER PERKS (renders only with live partners) ── */}
                <PartnerPerksSection offers={partnerOffers} isGreek={isGreek} />

               

                {/* ── 9. PRICE ────────────────────────────────────── */}
                {/* After the questions, not before them: nobody weighs a
                    subscription while they are still deciding what this is. */}
                <PricingPreview locale={locale} plans={pricingPlans} />


                {/* ── 9c. CONTACT ──────────────────────────────────── */}
                <HomeContact locale={locale} />

              {/* ── 8. QUESTIONS ─────────────────────────────────── */}
                <HomeFaq locale={locale} />

              
            </main>

            <PublicMegaFooter locale={locale} />
        </div>
    )
}
