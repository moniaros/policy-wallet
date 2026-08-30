import Link from "next/link"
import { ANSWER_PARAGRAPH, DEFINED_TERMS } from "@/lib/marketing/defined-terms"
import { pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"

/**
 * The answer block (§6): one paragraph that says what this is, followed by
 * the four defined terms it leans on. The paragraph is the page's definitive
 * extractable sentence (§7); the terms come from `lib/marketing/defined-terms`,
 * the same module that will emit the /lexiko DefinedTermSet — visible text and
 * structured data share one source by construction.
 *
 * Server component. The definitions are always visible — no tooltip, no
 * disclosure: a reader who needs «απαλλαγή» explained is exactly the reader
 * who will not discover a hover interaction.
 */
export function AnswerBlock({ locale }: { locale: MarketingLocale }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    return (
        <section
            aria-labelledby="answer-heading"
            className="bg-surface-wash [padding-block:var(--space-section)]"
        >
            <div className="mx-auto max-w-[1180px] px-g-6 md:px-g-8">
                <h2
                    id="answer-heading"
                    className="max-w-[24ch] text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                >
                    {t("Τι είναι το PolicyWallet;", "What is PolicyWallet?")}
                </h2>
                <p className="mt-g-5 max-w-[66ch] text-g-body-lg text-fg-secondary">
                    {pick(ANSWER_PARAGRAPH, locale)}
                </p>

                <dl className="mt-g-10 grid gap-g-4 sm:grid-cols-2 lg:grid-cols-4">
                    {DEFINED_TERMS.map((t) => (
                        <div
                            key={t.id}
                            className="rounded-g-lg border border-border-subtle bg-surface-raised p-g-5"
                        >
                            <dt className="text-g-display-sm font-semibold">
                                <Link
                                    href={localizeHref(`/lexiko/${t.glossarySlug}`, locale)}
                                    className="inline-block py-1 text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current"
                                >
                                    {pick(t.term, locale)}
                                </Link>
                            </dt>
                            <dd className="mt-g-2 text-g-body-sm text-fg-secondary">
                                {pick(t.definition, locale)}
                            </dd>
                        </div>
                    ))}
                </dl>

                <p className="mt-g-6 text-g-caption text-fg-secondary">
                    <Link
                        href={localizeHref("/lexiko", locale)}
                        className="inline-block py-1 font-semibold text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current"
                    >
                        {t("Όλο το λεξικό ασφαλιστικών όρων →", "The full insurance glossary →")}
                    </Link>
                </p>
            </div>
        </section>
    )
}
