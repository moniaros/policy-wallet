// No "use client": static markup, server-rendered on every product page.
import Link from "next/link"
import { JsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"
import { getLobFaqs, getLobRelated } from "@/lib/product/lob-faqs"
import { localizeHref } from "@/lib/seo/locale-links"
import { pick, type MarketingLocale } from "@/lib/marketing/positioning"
import type { ProductCategoryId } from "@/lib/product/catalog"

/**
 * Per-branch FAQ block for the 15 product pages (AEO).
 *
 * The visible answers and the FAQPage JSON-LD are rendered by this ONE
 * component from the SAME data, so structured data can never claim a question
 * the page does not visibly answer (the same honesty rule the homepage FAQ
 * enforces). Answers stay expanded — a snippet a crawler can lift must also
 * be a snippet a visitor can read without a click.
 */
export function LobFaq({
    categoryId,
    locale,
}: {
    categoryId: ProductCategoryId
    locale: MarketingLocale
}) {
    const items = getLobFaqs(categoryId)
    if (items.length === 0) return null
    const related = getLobRelated(categoryId)
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <section
            aria-labelledby={`lob-faq-heading-${categoryId}`}
            className="px-6 py-24 lg:px-12"
        >
            <div className="mx-auto max-w-[860px]">
                <h2
                    id={`lob-faq-heading-${categoryId}`}
                    className="mb-10 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-neutral-900 dark:text-white"
                >
                    {t("Αυτά που ρωτούν οι περισσότεροι.", "What most people ask.")}
                </h2>
                <div className="space-y-8">
                    {items.map((item) => (
                        <div
                            key={item.q.en}
                            className="rounded-2xl border border-neutral-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <h3 className="mb-3 text-lead font-semibold text-neutral-900 dark:text-white">
                                {pick(item.q, locale)}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                                {pick(item.a, locale)}
                            </p>
                        </div>
                    ))}
                </div>

                {related.length > 0 && (
                    <nav
                        aria-label={t("Σχετικοί οδηγοί και όροι", "Related guides and terms")}
                        className="mt-10 border-t border-neutral-200 pt-6 dark:border-slate-800"
                    >
                        <p className="mb-3 text-body-sm font-semibold text-neutral-900 dark:text-white">
                            {t("Διαβάστε περισσότερα", "Read more")}
                        </p>
                        <ul className="flex flex-wrap gap-x-6 gap-y-2">
                            {related.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={localizeHref(link.href, locale)}
                                        className="pw-inline-action inline-flex min-h-11 items-center text-body-sm"
                                    >
                                        {pick(link.label, locale)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </div>

            {/* Emitted here, from the same items the visitor just read. */}
            <JsonLd
                data={faqPageJsonLd(
                    items.map((item) => ({
                        question: pick(item.q, locale),
                        answer: pick(item.a, locale),
                    }))
                )}
            />
        </section>
    )
}
