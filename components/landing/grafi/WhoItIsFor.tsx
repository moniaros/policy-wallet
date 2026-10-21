import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { presentationCopy } from "@/lib/i18n/presentation"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"

export function WhoItIsFor({ locale }: { locale: LandingLocale }) {
    const copy = presentationCopy[locale]
    return (
        <section id="solutions" aria-labelledby="solutions-heading" className="scroll-mt-28 bg-surface-wash px-6 py-16 lg:px-12 lg:py-20">
            <div className="mx-auto max-w-page">
                <h2 id="solutions-heading" className="max-w-2xl text-balance text-h2 font-semibold leading-tight tracking-tight text-fg-primary lg:text-h1">{copy.audiencesHeading}</h2>
                <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-16">
                    <article className="border-t border-border-strong pt-6">
                        <h3 className="text-2xl font-semibold text-fg-primary">{copy.individualTitle}</h3>
                        <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-fg-secondary">{copy.individualBody}</p>
                        <Link href={authHref("/auth/signup?role=policyholder&source=landing_audience", locale)} className="pw-primary-button mt-6">
                            {pick(PRIMARY_ACTION, locale)}<ArrowRight aria-hidden className="size-4" />
                        </Link>
                    </article>
                    <article className="border-t border-border-strong pt-6">
                        <h3 className="text-2xl font-semibold text-fg-primary">{copy.professionalTitle}</h3>
                        <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-fg-secondary">{copy.professionalBody}</p>
                        <Link href={localizeHref("/solutions/agents", locale)} className="pw-secondary-button mt-6">
                            {copy.professionalLink}<ArrowRight aria-hidden className="size-4" />
                        </Link>
                    </article>
                </div>
            </div>
        </section>
    )
}
