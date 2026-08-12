import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import { Verdict } from "@/components/landing/ComparisonVerdict"
import {
    COMPARISON_COLUMNS,
    COMPARISON_ROWS,
    DIFFERENTIATORS,
    pick,
    type MarketingLocale,
} from "@/lib/marketing/positioning"

/**
 * The neutrality story — the single strongest thing PolicyWallet can say, and
 * the answer to "why should I use this instead of just asking my agent?".
 *
 * It used to live in the third paragraph of /company, where almost nobody
 * reads it. It now runs directly under the homepage hero.
 *
 * **It used to assert that story three times and prove it zero times.** The
 * three DIFFERENTIATORS shipped as three same-size cards of icon-plus-heading-
 * plus-text — the page's default container, used here for the one section that
 * least deserved a default. Meanwhile /compare already held the artifact that
 * makes the claim checkable: four columns naming the alternatives a Greek
 * household actually has, and a last row where the folder in the drawer beats
 * both professionals because it earns nothing from its answer. That table was
 * reachable only from a footer link.
 *
 * So the claims stay — they are the negation triad, and nothing else on the
 * site says them — but they lead the section as three plain lines instead of
 * three cards, and the evidence carries the body. Three rows here, all six on
 * /compare.
 *
 * Server component: static markup, no JS shipped.
 */

/**
 * Which three rows earn the homepage.
 *
 * Not the first three: the last one is the argument itself, so it goes last.
 * Indices into COMPARISON_ROWS, pinned by
 * tests/unit/homepage-comparison-excerpt.test.ts so a reordering of the source
 * array cannot silently change which rows a stranger sees first.
 */
const HOMEPAGE_ROW_INDICES = [2, 3, 5] as const

export function WhyDifferent({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const rows = HOMEPAGE_ROW_INDICES.map((i) => COMPARISON_ROWS[i])

    return (
        <section
            id="difference"
            aria-labelledby="difference-heading"
            className="scroll-mt-28 border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-page">
                <div className="mb-10 max-w-[640px]">
                    <h2
                        id="difference-heading"
                        className="mb-4 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t(
                            "Κανείς δεν μας πληρώνει για να σας πούμε κάτι συγκεκριμένο.",
                            "Nobody pays us to tell you a particular thing.",
                        )}
                    </h2>
                    <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Γι' αυτό η απάντηση που παίρνετε είναι απλώς η αλήθεια για την κάλυψή σας.",
                            "That is why the answer you get is simply the truth about your cover.",
                        )}
                    </p>
                </div>

                {/* The three claims, as claims. No card, no icon tile — the
                    proof is directly below them and does not need decorating. */}
                <ul className="mb-10 grid gap-x-8 gap-y-4 sm:grid-cols-3">
                    {DIFFERENTIATORS.map((item) => (
                        <li key={item.title.en}>
                            <p className="text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                {pick(item.title, locale)}
                            </p>
                            <p className="mt-1.5 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {pick(item.body, locale)}
                            </p>
                        </li>
                    ))}
                </ul>

                {/* The evidence. `pw-stacked-table` is the system's own answer
                    to a wide table on a phone: below 1024px each row becomes a
                    labelled block, so there is no horizontal scroller and no
                    column falls off the screen.

                    The card chrome is therefore `lg:`-only. Below 1024px the
                    primitive gives every row its own `rounded-2xl border`, so a
                    wrapper card here would put cards inside a card — the exact
                    nesting the craft floor bans. Above it the rows are plain
                    table rows again and the white ground is what separates the
                    table from the tinted section behind it. */}
                <div className="lg:rounded-2xl lg:border lg:border-[#E2E8F0] lg:bg-white lg:p-6 lg:dark:border-slate-800 lg:dark:bg-slate-950">
                    <table className="pw-stacked-table w-full border-collapse text-left">
                        <caption className="sr-only">
                            {t(
                                "Τι σας δίνει κάθε επιλογή: ο φάκελος στο συρτάρι, η ασφαλιστική σας, ο ασφαλιστής σας και το PolicyWallet.",
                                "What each option gives you: the folder in the drawer, your insurance company, your advisor and PolicyWallet.",
                            )}
                        </caption>
                        <thead>
                            <tr className="border-b border-[#E2E8F0] dark:border-slate-800">
                                <th scope="col" className="py-3 pr-4 text-caption font-semibold text-[#5B6A7A] dark:text-slate-400">
                                    {t("Τι θέλετε να ξέρετε", "What you want to know")}
                                </th>
                                {COMPARISON_COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        scope="col"
                                        className="py-3 pr-4 text-caption font-semibold text-[#5B6A7A] dark:text-slate-400"
                                    >
                                        {pick(col.label, locale)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.job.en}
                                    className="border-b border-[#E2E8F0] last:border-0 dark:border-slate-800"
                                >
                                    <th
                                        scope="row"
                                        className="py-4 pr-4 text-left align-middle text-body-lg font-medium text-[#0F172A] dark:text-white"
                                    >
                                        {pick(row.job, locale)}
                                    </th>
                                    {COMPARISON_COLUMNS.map((col) => (
                                        <td
                                            key={col.key}
                                            data-label={pick(col.label, locale)}
                                            className="py-4 pr-4 align-middle"
                                        >
                                            <Verdict value={row[col.key]} locale={locale} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6">
                    <Link
                        href={localizeHref("/compare", locale)}
                        className="inline-flex min-h-11 items-center gap-1.5 text-body-lg font-semibold text-[#0F172A] underline-offset-4 hover:underline dark:text-white"
                    >
                        {t("Δείτε τη σύγκριση με τις άλλες επιλογές", "See how this compares with the alternatives")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
