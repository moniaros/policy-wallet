"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { AlertTriangle, Clock, Euro, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusSummaryProps {
    activeCount: number
    expiringCount: number
    /** action_needed + unknown_duration + expired — everything the user should look at. */
    attentionCount: number
    /** Denominator for the completion ring. Expired policies belong here too. */
    totalPolicies: number
    totalPremium?: number
    /** Policies left out of totalPremium because they have no readable end date. */
    unknownDurationCount?: number
}

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** activeCount / totalPolicies, as a ring. The only gauge on this screen. */
function CompletionRing({ value, total }: { value: number; total: number }) {
    const ratio = total > 0 ? Math.min(value / total, 1) : 0

    return (
        <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90" aria-hidden="true">
            <circle
                cx="20"
                cy="20"
                r={RADIUS}
                fill="none"
                strokeWidth="3.5"
                className="stroke-black/10 dark:stroke-white/15"
            />
            <circle
                cx="20"
                cy="20"
                r={RADIUS}
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                className="stroke-primary transition-[stroke-dashoffset] duration-700 dark:stroke-mint"
            />
        </svg>
    )
}

/** One KPI. Accent is carried by the number and the icon chip — not by the card. */
function KpiCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
    ring,
}: {
    label: string
    value: number | string
    hint?: string
    icon: React.ElementType
    accent: 'positive' | 'warning' | 'critical' | 'brand'
    ring?: React.ReactNode
}) {
    const valueClass = {
        positive: 'text-primary dark:text-mint',
        warning: 'text-[#B45309] dark:text-amber-300',
        critical: 'text-[#B91C1C] dark:text-red-300',
        brand: 'text-black dark:text-white',
    }[accent]

    const chipClass = {
        positive: 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint',
        warning: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300',
        critical: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300',
        brand: 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70',
    }[accent]

    return (
        <div className="pw-card flex items-center gap-3 p-4">
            {ring ?? (
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', chipClass)}>
                    <Icon className="h-5 w-5" />
                </span>
            )}
            <div className="min-w-0">
                <p className="pw-kicker leading-tight">{label}</p>
                <p className={cn('mt-0.5 text-2xl leading-none font-semibold tabular-nums tracking-tight', valueClass)}>
                    {value}
                </p>
                {hint && (
                    <p className="mt-1 truncate text-micro text-black/50 dark:text-white/50">{hint}</p>
                )}
            </div>
        </div>
    )
}

export function StatusSummary({
    activeCount,
    expiringCount,
    attentionCount,
    totalPolicies,
    totalPremium = 0,
    unknownDurationCount = 0,
}: StatusSummaryProps) {
    const { t, language } = useLanguage()

    const premiumLabel = new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(totalPremium)

    const excludedNote =
        unknownDurationCount > 0
            ? (unknownDurationCount === 1
                ? t.status.premiumExcludesUnknown
                : t.status.premiumExcludesUnknownPlural
            ).replace('{count}', String(unknownDurationCount))
            : undefined

    return (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
                label={t.status.activePolicies}
                value={activeCount}
                hint={`${activeCount}/${totalPolicies} ${t.status.added}`}
                icon={ShieldCheck}
                accent="positive"
                ring={
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                        <CompletionRing value={activeCount} total={totalPolicies} />
                        <ShieldCheck className="absolute h-4 w-4 text-primary dark:text-mint" />
                    </span>
                }
            />

            <KpiCard
                label={t.policyStatus.expiringSoon}
                value={expiringCount}
                hint={t.status.within30Days}
                icon={Clock}
                accent="warning"
            />

            <KpiCard
                label={t.status.attentionNeeded}
                value={attentionCount}
                hint={t.status.needsReview}
                icon={AlertTriangle}
                accent="critical"
            />

            <KpiCard
                label={t.status.totalPremium}
                value={premiumLabel}
                hint={excludedNote}
                icon={Euro}
                accent="brand"
            />
        </div>
    )
}
