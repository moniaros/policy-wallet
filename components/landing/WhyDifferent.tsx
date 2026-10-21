import { presentationCopy } from "@/lib/i18n/presentation"
import Link from "next/link"
import styles from "./homepage-panels.module.css"
import { homepagePanelsCopy } from "@/lib/i18n/homepage-panels"
import { FileLock2, FileSearch, KeyRound, ArrowRight } from "lucide-react"
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
 * Trust in three concrete explanations, followed by the existing independence
 * comparison. Server-rendered; the native details control works without JS.
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
    const copy = homepagePanelsCopy[locale]
    const trustPoints = [
        { Icon: FileLock2, title: copy.trustDocuments, body: copy.trustDocumentsBody, link: copy.trustDocumentsLink, href: "/trust#documents" },
        { Icon: FileSearch, title: copy.trustAnalysis, body: copy.trustAnalysisBody, link: copy.trustAnalysisLink, href: "/trust#ai" },
        { Icon: KeyRound, title: copy.trustAccess, body: copy.trustAccessBody, link: copy.trustAccessLink, href: "/privacy" },
    ]
    const rows = HOMEPAGE_ROW_INDICES.map((i) => COMPARISON_ROWS[i])

    return (
        <section
            id="difference"
            aria-labelledby="difference-heading"
            className={styles.section}
        >
            <div className="mx-auto max-w-page">
                <div className="mb-10 max-w-[640px]">
                    <h2
                        id="difference-heading"
                        className={styles.heading}
                    >
                        {t(
                            "Κανείς δεν μας πληρώνει για να σας πούμε κάτι συγκεκριμένο.",
                            "Nobody pays us to tell you a particular thing.",
                        )}
                    </h2>
                    <p className="mt-6 text-lead leading-relaxed text-fg-secondary">
                        {presentationCopy[locale].independence}
                    </p>
                </div>

                <div className={styles.trustPoints}>
                    {trustPoints.map(({ Icon, title, body, link, href }) => <article key={href} className={styles.trustPoint}>
                        <Icon className={styles.trustIcon} strokeWidth={1.3} aria-hidden="true" />
                        <h3>{title}</h3><p>{body}</p>
                        <Link href={localizeHref(href, locale)}>{link}<ArrowRight size={18} aria-hidden="true" /></Link>
                    </article>)}
                </div>

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
                <details className="group">
                    <summary className="mb-6 cursor-pointer py-3 text-lg font-semibold text-fg-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{presentationCopy[locale].compareLabel}</summary>
                {/* The three claims, as claims. No card, no icon tile — the
                    proof is directly below them and does not need decorating. */}
                <ul className="mb-10 grid gap-x-8 gap-y-4 sm:grid-cols-3">
                    {DIFFERENTIATORS.map((item) => (
                        <li key={item.title.en}>
                            <p className="text-title font-semibold tracking-tight text-neutral-900 dark:text-white">
                                {pick(item.title, locale)}
                            </p>
                            <p className="mt-1.5 text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                                {pick(item.body, locale)}
                            </p>
                        </li>
                    ))}
                </ul>

                <div className="lg:rounded-2xl lg:border lg:border-neutral-200 lg:bg-white lg:p-6 lg:dark:border-slate-800 lg:dark:bg-slate-950">
                    <table className="pw-stacked-table w-full border-collapse text-left">
                        <caption className="sr-only">
                            {t(
                                "Τι σας δίνει κάθε επιλογή: ο φάκελος στο συρτάρι, η ασφαλιστική σας, ο ασφαλιστής σας και το PolicyWallet.",
                                "What each option gives you: the folder in the drawer, your insurance company, your advisor and PolicyWallet.",
                            )}
                        </caption>
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-slate-800">
                                <th scope="col" className="py-3 pr-4 text-caption font-semibold text-muted-foreground dark:text-slate-400">
                                    {t("Τι θέλετε να ξέρετε", "What you want to know")}
                                </th>
                                {COMPARISON_COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        scope="col"
                                        className="py-3 pr-4 text-caption font-semibold text-muted-foreground dark:text-slate-400"
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
                                    className="border-b border-neutral-200 last:border-0 dark:border-slate-800"
                                >
                                    <th
                                        scope="row"
                                        className="py-4 pr-4 text-left align-middle text-body-lg font-medium text-neutral-900 dark:text-white"
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

                </details>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                    <Link href={localizeHref("/trust", locale)} className="inline-flex min-h-11 items-center text-body-lg font-semibold text-fg-brand underline-offset-4 hover:underline">{presentationCopy[locale].trustLink}</Link>
                    <Link
                        href={localizeHref("/compare", locale)}
                        className="inline-flex min-h-11 items-center gap-1.5 text-body-lg font-semibold text-neutral-900 underline-offset-4 hover:underline dark:text-white"
                    >
                        {t("Δείτε τη σύγκριση με τις άλλες επιλογές", "See how this compares with the alternatives")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
