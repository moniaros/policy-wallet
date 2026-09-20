import Link from "next/link"
import { searchQuestions, searchQuestionsHeading } from "@/lib/marketing/search-questions"
import type { MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"

/** Visible answers and crawlable paths to the existing bilingual guides. */
export function SearchQuestions({ locale }: { locale: MarketingLocale }) {
    return (
        <section aria-labelledby="search-questions-heading" className="px-6 py-12 lg:px-12 lg:py-16">
            <div className="mx-auto max-w-reading">
                <h2 id="search-questions-heading" className="text-h2 font-semibold tracking-tight text-balance text-fg-primary">
                    {searchQuestionsHeading[locale]}
                </h2>
                <div className="mt-8 divide-y divide-border-subtle">
                    {searchQuestions.map((item) => (
                        <article key={item.id} className="py-6 first:pt-0">
                            <h3 className="text-title font-semibold text-fg-primary">{item.question[locale]}</h3>
                            <p className="mt-3 text-body-lg leading-relaxed text-fg-secondary">{item.answer[locale]}</p>
                            <Link
                                href={localizeHref(item.href, locale)}
                                className="mt-2 inline-flex min-h-11 items-center py-2 font-semibold text-fg-brand underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                            >
                                {item.link[locale]}
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
