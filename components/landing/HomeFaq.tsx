import { ChevronDown } from "lucide-react"
import { landingContent } from "@/lib/landing/content"
import type { MarketingLocale } from "@/lib/marketing/positioning"

/**
 * The homepage FAQ.
 *
 * This section exists for two reasons, and the second one is not optional:
 *
 *  1. It answers the objections that stop a signup — do you sell me
 *     insurance, is my data safe, how much is it.
 *  2. lib/landing/seo.ts emits every one of these questions as FAQPage
 *     JSON-LD. That markup was already being emitted while the page rendered
 *     no FAQ at all, which is a structured-data policy violation (the content
 *     a rich result quotes must be visible to the user). Both now read the
 *     same `landingContent.faq.items`, so they cannot drift apart again.
 *
 * Built on native <details>/<summary>: keyboard-operable and screen-reader
 * correct with no JS, so it stays a server component and works before hydration.
 */
export function HomeFaq({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const { title, items } = landingContent.faq

    return (
        <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-28 border-t border-neutral-200 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800"
        >
            <div className="mx-auto max-w-[820px]">
                <div className="mb-10 text-center">
                    <h2
                        id="faq-heading"
                        className="text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-900 lg:text-h1 dark:text-white"
                    >
                        {locale === "el" ? title.el : title.en}
                    </h2>
                </div>

                <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-slate-800 dark:border-slate-800">
                    {items.map((item) => (
                        <details key={item.id} id={item.id} className="group scroll-mt-28 lg:scroll-mt-36">
                            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-body-lg font-semibold text-neutral-900 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden dark:text-white dark:hover:text-[#A7F3D0] dark:focus-visible:outline-[#A7F3D0]">
                                {locale === "el" ? item.question.el : item.question.en}
                                <ChevronDown
                                    aria-hidden
                                    className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 dark:text-slate-400"
                                />
                            </summary>
                            <p className="pb-5 pr-9 text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                                {locale === "el" ? item.answer.el : item.answer.en}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    )
}
