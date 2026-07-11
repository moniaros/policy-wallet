"use client"

import { useState } from "react"
import {
    AlertTriangle,
    Award,
    Bell,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    Clock,
    Coins,
    Globe,
    Info,
    RefreshCw,
    Scale,
    ShieldOff,
    UserRound,
    XCircle,
} from "lucide-react"

import { pickLang, type FinePrintClause, type NotableCondition } from "@/lib/wallet/policy-detail"

interface ExclusionsCardProps {
    exclusions: string[]
    conditions: NotableCondition[]
    finePrint: FinePrintClause[]
    lang: "el" | "en"
    copy: {
        exclusionsTitle: string
        exclusionsSubtitle: string
        exclusionsListTitle: string
        notableConditionsTitle: string
        finePrintTitle: string
        actionRequiredChip: string
        noExclusionsDetected: string
        exclusionsReanalyzeHint: string
        showMoreFinePrint: string
        showLessFinePrint: string
        conditionTypes: Record<string, string>
        riskLevels: Record<string, string>
    }
    disclaimer: string
}

const CONDITION_ICON: Record<string, typeof Clock> = {
    waiting_period: Clock,
    auto_renewal: RefreshCw,
    cancellation_penalty: AlertTriangle,
    sub_limit: Scale,
    co_payment: Coins,
    age_limit: UserRound,
    geographic_restriction: Globe,
    claim_deadline: CalendarClock,
    notification_obligation: Bell,
    no_claims_bonus: Award,
}

const RISK_STYLES: Record<string, { border: string; bg: string; badge: string; text: string }> = {
    info: {
        border: "border-blue-200/70 dark:border-blue-800/50",
        bg: "bg-[#EFF6FF]/70 dark:bg-blue-950/20",
        badge: "bg-blue-100 text-[#1E40AF] dark:bg-blue-900/30 dark:text-blue-300",
        text: "text-black/75 dark:text-white/80",
    },
    warning: {
        border: "border-amber-200 dark:border-amber-900/40",
        bg: "bg-[#FEF3C7]/50 dark:bg-amber-950/15",
        badge: "bg-amber-100 text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300",
        text: "text-black/75 dark:text-white/80",
    },
    critical: {
        border: "border-red-200 dark:border-red-900/40",
        bg: "bg-[#FEF2F2]/70 dark:bg-red-950/15",
        badge: "bg-red-100 text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300",
        text: "text-black/75 dark:text-white/80",
    },
}

const FINE_PRINT_PREVIEW_COUNT = 3

/**
 * Everything the policy does NOT do: exclusions, notable conditions
 * (waiting periods, deadlines, sub-limits) and fine-print clauses that
 * commonly surprise policyholders at claim time.
 */
export function ExclusionsCard({ exclusions, conditions, finePrint, lang, copy, disclaimer }: ExclusionsCardProps) {
    const [showAllFinePrint, setShowAllFinePrint] = useState(false)

    const hasAnyContent = exclusions.length > 0 || conditions.length > 0 || finePrint.length > 0
    const sortedFinePrint = [...finePrint].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
        return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3)
    })
    const visibleFinePrint = showAllFinePrint ? sortedFinePrint : sortedFinePrint.slice(0, FINE_PRINT_PREVIEW_COUNT)

    return (
        <div className="pw-card p-6 sm:p-7">
            <div className="mb-1 flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-[#B91C1C] dark:text-red-400" />
                <h2 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">{copy.exclusionsTitle}</h2>
            </div>
            <p className="mb-5 text-xs text-black/55 dark:text-white/60">{copy.exclusionsSubtitle}</p>

            {!hasAnyContent ? (
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-4 dark:border-white/15 dark:bg-white/5">
                    <p className="text-sm text-black/65 dark:text-white/70">{copy.noExclusionsDetected}</p>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/55">{copy.exclusionsReanalyzeHint}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {exclusions.length > 0 && (
                        <div>
                            <h3 className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                                {copy.exclusionsListTitle} ({exclusions.length})
                            </h3>
                            <ul className="space-y-2">
                                {exclusions.map((exclusion, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-2.5 rounded-xl border border-red-200/60 bg-[#FEF2F2]/70 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-950/15"
                                    >
                                        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
                                        <p className="text-sm font-medium text-black/80 dark:text-white/85">{exclusion}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {conditions.length > 0 && (
                        <div>
                            <h3 className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                                {copy.notableConditionsTitle} ({conditions.length})
                            </h3>
                            <ul className="space-y-2">
                                {conditions.map((condition, i) => {
                                    const ConditionIcon = CONDITION_ICON[condition.conditionType] || Info
                                    const typeLabel = copy.conditionTypes[condition.conditionType] || condition.conditionType
                                    return (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2.5 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 dark:border-white/15 dark:bg-white/5"
                                        >
                                            <ConditionIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/55">
                                                        {typeLabel}
                                                    </span>
                                                    {condition.value && (
                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary dark:bg-primary/15 dark:text-mint">
                                                            {condition.value}
                                                        </span>
                                                    )}
                                                    {condition.userActionRequired && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300">
                                                            {copy.actionRequiredChip}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm text-black/75 dark:text-white/80">{pickLang(condition.summary, lang)}</p>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}

                    {finePrint.length > 0 && (
                        <div>
                            <h3 className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                                {copy.finePrintTitle} ({finePrint.length})
                            </h3>
                            <ul className="space-y-2">
                                {visibleFinePrint.map((clause, i) => {
                                    const styles = RISK_STYLES[clause.riskLevel] || RISK_STYLES.info
                                    const riskLabel = copy.riskLevels[clause.riskLevel] || clause.riskLevel
                                    return (
                                        <li key={i} className={`rounded-xl border px-3 py-2.5 ${styles.border} ${styles.bg}`}>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
                                                    {riskLabel}
                                                </span>
                                                <span className="text-[10px] font-semibold text-black/45 dark:text-white/50">{clause.section}</span>
                                            </div>
                                            <p className={`mt-1 text-sm ${styles.text}`}>{pickLang(clause.impactSummary, lang)}</p>
                                        </li>
                                    )
                                })}
                            </ul>
                            {sortedFinePrint.length > FINE_PRINT_PREVIEW_COUNT && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllFinePrint(!showAllFinePrint)}
                                    className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint cursor-pointer"
                                >
                                    {showAllFinePrint ? copy.showLessFinePrint : `${copy.showMoreFinePrint} (${sortedFinePrint.length})`}
                                    {showAllFinePrint ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-start gap-2 rounded-xl border border-amber-200/50 bg-[#FEF3C7]/40 px-3 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/10">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                        <p className="text-xs leading-relaxed text-[#B45309] dark:text-amber-400">{disclaimer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
