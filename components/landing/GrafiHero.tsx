"use client"

import { HeroVideo } from "./HeroVideo"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowDown } from "lucide-react"
import { CTA_REASSURANCE, HERO_EMAIL_CTA, HERO_SUBHEAD, PRIMARY_ACTION, PROMISE, pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { authHref } from "@/lib/seo/locale-links"
import { EmailCapture } from "@/src/design-system"
import { presentationCopy } from "@/lib/i18n/presentation"

export function GrafiHero({ locale }: { locale: MarketingLocale }) {
    const router = useRouter()
    const copy = presentationCopy[locale]
    return (
        <section className="pw-public-hero">
            <div className="pw-public-hero-grid">
                <div className="pw-public-hero-copy">
                    <h1 className="max-w-[19ch] text-balance text-[clamp(2.25rem,4.2vw,4.5rem)] font-bold leading-[1.08] tracking-[-0.035em] text-white">
                        {pick(PROMISE.lead, locale)}{" "}
                        <span className="text-white">{pick(PROMISE.accent, locale)}</span>
                    </h1>
                    <p className="mt-6 max-w-[48ch] text-g-body-lg text-white/90">{pick(HERO_SUBHEAD, locale)}</p>
                    <div className="mt-7 max-w-lg">
                        <EmailCapture
                            label={copy.emailLabel}
                            cta={pick(HERO_EMAIL_CTA, locale)}
                            formAriaLabel={pick(PRIMARY_ACTION, locale)}
                            onSubmit={(email) => router.push(authHref(`/auth/signup?role=policyholder&source=landing_hero&email=${encodeURIComponent(email)}`, locale))}
                        />
                        <p className="mt-3 text-sm text-white/90">{pick(CTA_REASSURANCE, locale)}</p>
                        <Link href="#reading-demo" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                            {copy.demoLink}<ArrowDown aria-hidden className="size-4" />
                        </Link>
                    </div>
                </div>
                <div className="pw-public-hero-media">
                    <HeroVideo locale={locale} />
                </div>
            </div>
        </section>
    )
}
