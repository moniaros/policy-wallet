"use client"

import { useMemo } from "react"
import { Euro, TrendingUp, Briefcase, BarChart3 } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState } from "@/components/ui/EmptyState"
import { StatTile } from "@/components/ui/StatTile"
import { useLanguage } from "@/contexts/LanguageContext"
import type { CommissionSummary } from "./actions"
import { TableShell } from "@/components/ui/TableShell"

import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
import { formatDate, resolveLocale } from "@/lib/i18n/format"
const copy = {
    en: {
        title: "Commission Tracker",
        subtitle: "Track earned and projected commissions across your portfolio.",
        kicker: "REVENUE",
        wonCommission: "Earned Commission",
        estimatedPipeline: "Pipeline Commission",
        byLine: "By Line of Business",
        monthlyTrend: "Monthly Trend",
        lob: "Line",
        sortLabel: "Sort",
        defaultOrder: "Default order",
        premium: "Premium",
        commission: "Commission",
        opportunities: "Opps",
        won: "Won",
        projected: "Projected",
        noData: "No commission data yet",
        noDataDesc: "Commission data will appear as you win opportunities with monetary values.",
    },
    el: {
        title: "Παρακολούθηση προμηθειών",
        subtitle: "Παρακολούθηση κερδισμένων και προβλεπόμενων προμηθειών.",
        kicker: "ΕΣΟΔΑ",
        wonCommission: "Κερδισμένη προμήθεια",
        estimatedPipeline: "Προβλεπόμενη προμήθεια",
        byLine: "Ανά κλάδο",
        monthlyTrend: "Μηνιαία τάση",
        lob: "Κλάδος",
        sortLabel: "Ταξινόμηση",
        defaultOrder: "Προεπιλεγμένη σειρά",
        premium: "Ασφάλιστρο",
        commission: "Προμήθεια",
        opportunities: "Ευκ.",
        won: "Κερδ.",
        projected: "Προβλ.",
        noData: "Δεν υπάρχουν δεδομένα",
        noDataDesc: "Τα δεδομένα προμηθειών θα εμφανιστούν καθώς κερδίζετε ευκαιρίες.",
    },
}

interface Props {
    data: CommissionSummary
}

type CommissionSortKey = "lob" | "premium" | "commission" | "opportunities"

export function CommissionsClient({ data }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const { sort, toggle, setSort } = useTableSort<CommissionSortKey>()
    const sortedByLob = useMemo(
        () => applySort<any, CommissionSortKey>(data.byLob, sort, {
        lob: (r: any) => r.lob,
        premium: (r: any) => r.wonPremium,
        commission: (r: any) => r.wonCommission,
        opportunities: (r: any) => r.opportunityCount,
        }),
        [data.byLob, sort]
    )

    const fmt = (n: number) =>
        new Intl.NumberFormat(resolveLocale(language), {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(n)

    // `month` arrives as "YYYY-MM" so the label can follow the reader. It used to
    // be formatted server-side with a hardcoded "en-GB", which put Jan/Feb/Mar on
    // a Greek agent's commission chart.
    const monthLabel = (ym: string) => {
        const [y, m] = ym.split("-").map(Number)
        if (!y || !m) return ym
        return formatDate(new Date(Date.UTC(y, m - 1, 1)), language === "el" ? "el" : "en", {
            month: "short",
            year: "2-digit",
            day: undefined,
        })
    }

    const maxBar = Math.max(...data.monthlyTrend.map((m) => m.won + m.estimated), 1)

    // The two bars of one month: earned in the brand fill, projected in the
    // same fill at a lower opacity — one hue, two weights, and the legend
    // beneath names both. No second green.
    const wonBar = "bg-primary"
    const projectedBar = "bg-primary/35"

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen is. The «ΕΣΟΔΑ» eyebrow is gone:
                    the heading carries its own weight. */}
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.subtitle}</p>
                </div>

                {/* Two fact tiles on the shared StatTile — the accent tints the
                    glyph only; the number stays in the text colour. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <StatTile icon={Euro} label={t.wonCommission} value={fmt(data.totalWon)} accent="brand" />
                    <StatTile icon={TrendingUp} label={t.estimatedPipeline} value={fmt(data.totalEstimated)} />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* By line of business */}
                    <section className="pw-card overflow-hidden" aria-labelledby="commissions-by-line">
                        <div className="pw-pad pb-0">
                            <CardHead
                                icon={Briefcase}
                                title={t.byLine}
                                id="commissions-by-line"
                                meta={data.byLob.length > 0 ? <span className="tabular-nums">{data.byLob.length}</span> : undefined}
                            />
                            {data.byLob.length > 0 && (
                                /* thead is sr-only below lg, so the column headers cannot be
                                   used on a phone — this drives the same sort state. */
                                <MobileSortControl
                                    sort={sort}
                                    onSort={toggle}
                                    onClear={() => setSort(null)}
                                    columns={[{ key: "lob", label: t.lob }, { key: "premium", label: t.premium }, { key: "commission", label: t.commission }, { key: "opportunities", label: t.opportunities }]}
                                    label={t.sortLabel}
                                    defaultLabel={t.defaultOrder}
                                    className="mt-3"
                                />
                            )}
                        </div>

                        {data.byLob.length === 0 ? (
                            <div className="pw-pad pt-0">
                                <EmptyState
                                    className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                                    icon={Briefcase}
                                    headline={t.noData}
                                    description={t.noDataDesc}
                                />
                            </div>
                        ) : (
                            <TableShell label={t.byLine}>
                                <table className="pw-stacked-table w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <SortableColumn columnKey="lob" sort={sort} onSort={toggle} label={t.lob} align="left" />
                                            <SortableColumn columnKey="premium" sort={sort} onSort={toggle} label={t.premium} align="right" />
                                            <SortableColumn columnKey="commission" sort={sort} onSort={toggle} label={t.commission} align="right" />
                                            <SortableColumn columnKey="opportunities" sort={sort} onSort={toggle} label={t.opportunities} align="right" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedByLob.map((row) => (
                                            <tr key={row.lob} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
                                                <td data-label={t.lob} className="px-4 py-3 font-semibold capitalize text-foreground">{row.lob.replace(/_/g, " ")}</td>
                                                <td data-label={t.premium} className="px-4 py-3 text-right tabular-nums text-foreground">
                                                    <div>{fmt(row.wonPremium)}</div>
                                                    {row.estimatedPremium > 0 && (
                                                        <div className="text-caption text-muted-foreground">+{fmt(row.estimatedPremium)}</div>
                                                    )}
                                                </td>
                                                <td data-label={t.commission} className="px-4 py-3 text-right tabular-nums">
                                                    <span className="font-semibold text-foreground">{fmt(row.wonCommission)}</span>
                                                    {row.estimatedCommission > 0 && (
                                                        <div className="text-caption text-muted-foreground">+{fmt(row.estimatedCommission)}</div>
                                                    )}
                                                </td>
                                                <td data-label={t.opportunities} className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.opportunityCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableShell>
                        )}
                    </section>

                    {/* Monthly trend */}
                    <section className="pw-card pw-pad" aria-labelledby="commissions-monthly-trend">
                        <CardHead icon={BarChart3} title={t.monthlyTrend} id="commissions-monthly-trend" />

                        {data.monthlyTrend.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent px-0 py-6 !shadow-none dark:!bg-transparent"
                                icon={BarChart3}
                                headline={t.noData}
                                description={t.noDataDesc}
                            />
                        ) : (
                        <div className="mt-4 space-y-3">
                            {data.monthlyTrend.map((m) => {
                                const wonPct = maxBar > 0 ? (m.won / maxBar) * 100 : 0
                                const estPct = maxBar > 0 ? (m.estimated / maxBar) * 100 : 0
                                return (
                                    <div key={m.month}>
                                        <div className="mb-1.5 flex items-center justify-between gap-3">
                                            <span className="text-caption font-medium text-muted-foreground">{monthLabel(m.month)}</span>
                                            <span className="flex items-baseline gap-3 text-caption tabular-nums">
                                                <span className="font-semibold text-foreground">{fmt(m.won)}</span>
                                                {m.estimated > 0 && (
                                                    <span className="text-muted-foreground">+{fmt(m.estimated)}</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                            {wonPct > 0 && (
                                                <div
                                                    className={`h-full rounded-l-full ${wonBar}`}
                                                    style={{ width: `${Math.max(wonPct, 2)}%` }}
                                                />
                                            )}
                                            {estPct > 0 && (
                                                <div
                                                    className={`h-full ${projectedBar}`}
                                                    style={{ width: `${Math.max(estPct, 2)}%` }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        )}

                        <div className="mt-5 flex items-center gap-6 border-t border-border pt-4">
                            <span className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
                                <span className={`h-2.5 w-2.5 rounded-full ${wonBar}`} aria-hidden="true" />
                                {t.won}
                            </span>
                            <span className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
                                <span className={`h-2.5 w-2.5 rounded-full ${projectedBar}`} aria-hidden="true" />
                                {t.projected}
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
