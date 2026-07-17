"use client"

import { Euro, TrendingUp, Briefcase, BarChart3 } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import type { CommissionSummary } from "./actions"

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
        premium: "Premium",
        commission: "Commission",
        opportunities: "Opps",
        won: "Won",
        projected: "Projected",
        noData: "No commission data yet",
        noDataDesc: "Commission data will appear as you win opportunities with monetary values.",
    },
    el: {
        title: "Παρακολούθηση Προμηθειών",
        subtitle: "Παρακολούθηση κερδισμένων και προβλεπόμενων προμηθειών.",
        kicker: "ΕΣΟΔΑ",
        wonCommission: "Κερδισμένη Προμήθεια",
        estimatedPipeline: "Προβλεπόμενη Προμήθεια",
        byLine: "Ανά Κλάδο",
        monthlyTrend: "Μηνιαία Τάση",
        lob: "Κλάδος",
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

export function CommissionsClient({ data }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]

    const fmt = (n: number) =>
        new Intl.NumberFormat(language === "el" ? "el-GR" : "en-US", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(n)

    const maxBar = Math.max(...data.monthlyTrend.map((m) => m.won + m.estimated), 1)

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                {/* Header */}
                <div className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">{t.kicker}</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                        {t.title}
                    </h1>
                    <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                        {t.subtitle}
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="arc-card p-6 border-t-4 border-t-primary">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                                <Euro className="w-5 h-5 text-primary dark:text-mint" />
                            </div>
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t.wonCommission}</span>
                        </div>
                        <p className="text-3xl font-black text-primary dark:text-mint">{fmt(data.totalWon)}</p>
                    </div>

                    <div className="arc-card p-6 border-t-4 border-t-mint">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-mint/20 dark:bg-primary/15 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-primary dark:text-mint" />
                            </div>
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t.estimatedPipeline}</span>
                        </div>
                        <p className="text-3xl font-black text-primary/70 dark:text-mint/80">{fmt(data.totalEstimated)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By LoB */}
                    <div className="arc-card p-6">
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-5 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-primary dark:text-mint" />
                            {t.byLine}
                        </h3>

                        {data.byLob.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                                icon={Briefcase}
                                headline={t.noData}
                                description={t.noDataDesc}
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                            <th className="text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest pb-3">{t.lob}</th>
                                            <th className="text-right text-[10px] font-black text-neutral-400 uppercase tracking-widest pb-3">{t.premium}</th>
                                            <th className="text-right text-[10px] font-black text-neutral-400 uppercase tracking-widest pb-3">{t.commission}</th>
                                            <th className="text-right text-[10px] font-black text-neutral-400 uppercase tracking-widest pb-3">{t.opportunities}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.byLob.map((row) => (
                                            <tr key={row.lob} className="border-b border-neutral-50 dark:border-neutral-800/50">
                                                <td className="py-3 font-bold text-foreground capitalize">{row.lob.replace(/_/g, " ")}</td>
                                                <td className="py-3 text-right text-neutral-600 dark:text-neutral-400">
                                                    <div>{fmt(row.wonPremium)}</div>
                                                    {row.estimatedPremium > 0 && (
                                                        <div className="text-xs text-neutral-400">+{fmt(row.estimatedPremium)}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="font-bold text-primary dark:text-mint">{fmt(row.wonCommission)}</span>
                                                    {row.estimatedCommission > 0 && (
                                                        <div className="text-xs text-primary/60 dark:text-mint/70">+{fmt(row.estimatedCommission)}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right text-neutral-500">{row.opportunityCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Monthly Trend */}
                    <div className="arc-card p-6">
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-5 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary dark:text-mint" />
                            {t.monthlyTrend}
                        </h3>

                        {data.monthlyTrend.length === 0 ? (
                            <EmptyState
                                className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                                icon={BarChart3}
                                headline={t.noData}
                                description={t.noDataDesc}
                            />
                        ) : (
                        <div className="space-y-3">
                            {data.monthlyTrend.map((m) => {
                                const wonPct = maxBar > 0 ? (m.won / maxBar) * 100 : 0
                                const estPct = maxBar > 0 ? (m.estimated / maxBar) * 100 : 0
                                return (
                                    <div key={m.month}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-neutral-500">{m.month}</span>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="font-bold text-primary dark:text-mint">{fmt(m.won)}</span>
                                                {m.estimated > 0 && (
                                                    <span className="text-primary/60 dark:text-mint/70">+{fmt(m.estimated)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                                            {wonPct > 0 && (
                                                <div
                                                    className="h-full bg-primary rounded-l-full"
                                                    style={{ width: `${Math.max(wonPct, 2)}%` }}
                                                />
                                            )}
                                            {estPct > 0 && (
                                                <div
                                                    className="h-full bg-mint"
                                                    style={{ width: `${Math.max(estPct, 2)}%` }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        )}

                        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary" />
                                <span className="text-xs font-bold text-neutral-500">{t.won}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-mint" />
                                <span className="text-xs font-bold text-neutral-500">{t.projected}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
