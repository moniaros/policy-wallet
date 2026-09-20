"use client"

/**
 * The Grafí hero: ONE fixed promise as the H1, the storage line demoted to the
 * sub-head, an inline email capture as the primary action, the needs check as
 * secondary, and the product visible immediately in a DeviceFrame. Replaces
 * the rotating-headline carousel — one visitor, one value proposition, and the
 * page's <h1> no longer changes every seven seconds under crawlers and screen
 * readers. (HeroSlides.tsx remains in the tree for its unit baselines; nothing
 * renders it.)
 */
import { ProductStage } from "./ProductStage"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CATEGORY, CTA_REASSURANCE, HERO_EMAIL_CTA, REGISTRATION_PAUSED, EXPLORE_NEEDS, HERO_SUBHEAD, PRIMARY_ACTION, PROMISE, pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import { EmailCapture } from "@/src/design-system"

export function GrafiHero({ locale, registrationsOpen = true }: { locale: MarketingLocale; registrationsOpen?: boolean }) {
    const router = useRouter()
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    return (
        <section className="px-g-6 py-g-10 lg:px-g-12 lg:py-g-12">
            <div className="mx-auto grid max-w-[1180px] items-start gap-g-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                   
                    <h1 className="max-w-[15ch] text-balance text-g-display-xl font-extrabold tracking-[-0.024em] text-fg-primary">
                        {pick(PROMISE.lead, locale)}{" "}
                        <span className="text-fg-brand">{pick(PROMISE.accent, locale)}</span>
                    </h1>
                    <p className="mt-g-5 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {pick(HERO_SUBHEAD, locale)}
                    </p>
                    <div className="mt-g-6">
                        {registrationsOpen ? <EmailCapture
                            label={t("Το email σας", "Your email")}
                            cta={pick(HERO_EMAIL_CTA, locale)}
                            formAriaLabel={pick(PRIMARY_ACTION, locale)}
                            onSubmit={(email) =>
                                router.push(authHref(`/auth/signup?role=policyholder&source=landing_hero&email=${encodeURIComponent(email)}`, locale))
                            }
                        /> : <Link href={localizeHref("/needs", locale)} className="pw-primary-button pw-btn-lg">{pick(EXPLORE_NEEDS, locale)}</Link>}
                        <p className="mt-g-2 text-sm text-fg-secondary">{pick(registrationsOpen ? CTA_REASSURANCE : REGISTRATION_PAUSED, locale)}</p>
                        {registrationsOpen && <Link
                            href={localizeHref("/needs", locale)}
                            className="mt-g-3 inline-block min-h-11 py-g-2 font-semibold text-fg-brand underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                        >
                            {t("Ή κάντε τον έλεγχο αναγκών σε 6 βήματα →", "Or take the 6-step needs check →")}
                        </Link>}
                    </div>
                </div>
                <div className="w-full min-w-0 justify-self-center">
                    <ProductStage locale={locale} />
                </div>
            </div>
        </section>
    )
}
