import { Verdict } from "@/components/landing/ComparisonVerdict"
import {
    COMPARISON_COLUMNS,
    COMPARISON_ROWS,
    pick,
    type MarketingLocale,
} from "@/lib/marketing/positioning"

/**
 * The homepage comparison table (§6), on the same single source /compare
 * renders — COMPARISON_COLUMNS / COMPARISON_ROWS in positioning.ts — so the
 * two surfaces cannot disagree about a verdict.
 *
 * A real <table> with `th scope` (§7: answer engines read tables, not divs),
 * first column and header sticky, and the whole thing scrolling inside its
 * own overflow container — the page never scrolls sideways for it.
 *
 * Server component: static markup, no JS shipped.
 */
export function ComparisonBand({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    return (
        <section
            aria-labelledby="comparison-heading"
            className="bg-surface-wash [padding-block:var(--space-section)]"
        >
            <div className="mx-auto max-w-[1180px] px-g-6 md:px-g-8">
                <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-brand">
                    {t("Η σύγκριση", "The comparison")}
                </p>
                <h2
                    id="comparison-heading"
                    className="mt-g-3 max-w-[26ch] text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                >
                    {t(
                        "Ποιος σας λέει την αλήθεια για τις καλύψεις σας;",
                        "Who tells you the truth about your cover?",
                    )}
                </h2>

                <div className="mt-g-8 overflow-x-auto rounded-g-lg border border-border-subtle bg-surface-raised">
                    <table className="w-full min-w-[760px] border-collapse text-start">
                        <caption className="sr-only">
                            {t(
                                "Σύγκριση: φάκελος, ασφαλιστική, ασφαλιστής, PolicyWallet",
                                "Comparison: folder, insurer, agent, PolicyWallet",
                            )}
                        </caption>
                        <thead>
                            <tr className="border-b border-border-subtle">
                                <th scope="col" className="sticky left-0 bg-surface-raised p-g-4 text-start text-g-body-sm font-semibold text-fg-secondary">
                                    {t("Τι χρειάζεστε", "What you need")}
                                </th>
                                {COMPARISON_COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        scope="col"
                                        className={
                                            col.key === "policywallet"
                                                ? "bg-surface-sunken p-g-4 text-start text-g-body-sm font-bold text-fg-brand"
                                                : "p-g-4 text-start text-g-body-sm font-semibold text-fg-primary"
                                        }
                                    >
                                        {pick(col.label, locale)}
                                        <span className="mt-1 block text-g-caption font-normal text-fg-secondary">
                                            {pick(col.note, locale)}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARISON_ROWS.map((row, i) => (
                                <tr key={i} className="border-b border-border-subtle last:border-b-0">
                                    <th
                                        scope="row"
                                        className="sticky left-0 bg-surface-raised p-g-4 text-start text-g-body-sm font-medium text-fg-primary"
                                    >
                                        {pick(row.job, locale)}
                                    </th>
                                    <td className="p-g-4"><Verdict value={row.folder} locale={locale} /></td>
                                    <td className="p-g-4"><Verdict value={row.insurer} locale={locale} /></td>
                                    <td className="p-g-4"><Verdict value={row.advisor} locale={locale} /></td>
                                    <td className="bg-surface-sunken p-g-4"><Verdict value={row.policywallet} locale={locale} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
