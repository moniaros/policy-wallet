"use client"

import Image from "next/image"
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
        <section className="px-6 pb-12 pt-6 lg:px-12 lg:pb-16 lg:pt-10">
            <div className="mx-auto grid max-w-page items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="py-4">
                    <h1 className="max-w-[19ch] text-balance text-[clamp(2.25rem,4.2vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.035em] text-fg-primary">
                        {pick(PROMISE.lead, locale)}{" "}
                        <span className="text-fg-brand">{pick(PROMISE.accent, locale)}</span>
                    </h1>
                    <p className="mt-6 max-w-[48ch] text-g-body-lg text-fg-secondary">{pick(HERO_SUBHEAD, locale)}</p>
                    <div className="mt-7 max-w-lg">
                        <EmailCapture
                            label={copy.emailLabel}
                            cta={pick(HERO_EMAIL_CTA, locale)}
                            formAriaLabel={pick(PRIMARY_ACTION, locale)}
                            onSubmit={(email) => router.push(authHref(`/auth/signup?role=policyholder&source=landing_hero&email=${encodeURIComponent(email)}`, locale))}
                        />
                        <p className="mt-3 text-sm text-fg-secondary">{pick(CTA_REASSURANCE, locale)}</p>
                        <Link href="#reading-demo" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-fg-brand underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                            {copy.demoLink}<ArrowDown aria-hidden className="size-4" />
                        </Link>
                    </div>
                </div>
                <figure className="min-w-0">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-[4/3]">
                        <Image src="/images/presentation/policy-review.webp" alt={copy.photoAlt} fill priority sizes="(min-width: 1280px) 570px, (min-width: 1024px) 45vw, 100vw" className="object-cover object-[65%_center]" />
                    </div>
                    <figcaption className="mt-2 text-sm text-fg-secondary">{copy.photoCaption}</figcaption>
                </figure>
            </div>
        </section>
    )
}
