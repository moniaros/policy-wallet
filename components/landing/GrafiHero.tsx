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
import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CATEGORY, CTA_REASSURANCE, HERO_EMAIL_CTA, HERO_SUBHEAD, PRIMARY_ACTION, PROMISE, pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import { EmailCapture, DeviceFrame } from "@/src/design-system"
import { AppScreen, DashboardScreen, WalletScreen, CoverageMapScreen, SampleStamp, type AppTab } from "@/components/landing/real-screens/RealScreens"

export function GrafiHero({ locale }: { locale: MarketingLocale }) {
    const router = useRouter()
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    /**
     * REAL app screens — one rehearsed session of the app: the home screen,
     * the wallet, the coverage map — as the signed-in app renders them, on
     * fixture data. The frame navigates between them the way the app does
     * (DeviceFrame), and each screen plays its own entrance when it becomes
     * the live one (AppScreen). The ring, the chips and the fake rows this
     * frame used to show were a product the app does not look like.
     */
    const screen = (tab: AppTab, node: React.ReactNode) =>
        function liveScreen(active: boolean) {
            return (
                <AppScreen locale={locale} fixed active={active} tab={tab} defaultScale={284 / 390}>
                    {node}
                </AppScreen>
            )
        }
    const screens = [
        { id: "home", label: t("Αρχική — τι περιέχει ο φάκελος", "Home — what the folder holds"), content: screen("home", <DashboardScreen locale={locale} />) },
        { id: "wallet", label: t("Ο φάκελός μου", "My wallet"), content: screen("wallet", <WalletScreen locale={locale} />) },
        { id: "map", label: t("Χάρτης κάλυψης", "Coverage map"), content: screen("protection", <CoverageMapScreen locale={locale} />) },
    ]

    return (
        <section className="px-g-6 lg:px-g-12 [padding-block:var(--space-section)]">
            <div className="mx-auto grid max-w-[1180px] items-center gap-g-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                   
                    <h1 className="max-w-[15ch] text-balance text-g-display-xl font-extrabold tracking-[-0.024em] text-fg-primary">
                        {pick(PROMISE.lead, locale)}{" "}
                        <span className="text-fg-brand">{pick(PROMISE.accent, locale)}</span>
                    </h1>
                    <p className="mt-g-5 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {pick(HERO_SUBHEAD, locale)}
                    </p>
                    <div className="mt-g-6">
                        <EmailCapture
                            label={t("Το email σας", "Your email")}
                            cta={pick(HERO_EMAIL_CTA, locale)}
                            formAriaLabel={pick(PRIMARY_ACTION, locale)}
                            onSubmit={(email) =>
                                router.push(authHref(`/auth/signup?role=policyholder&source=landing_hero&email=${encodeURIComponent(email)}`, locale))
                            }
                        />
                        <p className="mt-g-2 text-sm text-fg-secondary">{pick(CTA_REASSURANCE, locale)}</p>
                        <Link
                            href={localizeHref("/needs", locale)}
                            className="mt-g-3 inline-block min-h-11 py-g-2 font-semibold text-fg-brand underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                        >
                            {t("Ή κάντε τον έλεγχο αναγκών σε 6 βήματα →", "Or take the 6-step needs check →")}
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-g-2 justify-self-center">
                    <DeviceFrame screens={screens} width={300} padded={false} />
                    <SampleStamp locale={locale} />
                </div>
            </div>
        </section>
    )
}
