import { ReadingDemo } from "@/src/design-system/reading-demo"
import { presentationCopy } from "@/lib/i18n/presentation"
import type { MarketingLocale } from "@/lib/marketing/positioning"

export function ReadingProof({ locale }: { locale: MarketingLocale }) {
    const copy = presentationCopy[locale]
    return (
        <section id="reading-demo" aria-labelledby="reading-demo-heading" className="scroll-mt-28 bg-surface-base px-6 py-14 lg:px-12 lg:py-20">
            <div className="mx-auto max-w-page">
                <div className="mb-9 grid gap-5 lg:grid-cols-2 lg:gap-14">
                    <h2 id="reading-demo-heading" className="max-w-[20ch] text-balance text-h2 font-semibold leading-tight tracking-tight text-fg-primary lg:text-h1">{copy.demoHeading}</h2>
                    <p className="max-w-[52ch] self-end text-lg leading-relaxed text-fg-secondary">{copy.demoIntro}</p>
                </div>
                <ReadingDemo locale={locale} />
                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-fg-secondary">{copy.demoNote}</p>
            </div>
        </section>
    )
}
