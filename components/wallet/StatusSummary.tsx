"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { AlertTriangle, Clock, Euro, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatTile, StatGrid } from "@/components/ui/StatTile"

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
    /** In-force policies with no premium recorded — they add 0 to the total. */
    unknownPremiumCount?: number
    /** Currency `totalPremium` is stated in — the majority one in force. */
    premiumCurrency?: string
    /** In-force policies in another currency, left out of the total. */
    otherCurrencyCount?: number
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

export function StatusSummary({
    activeCount,
    expiringCount,
    attentionCount,
    totalPolicies,
    totalPremium = 0,
    unknownDurationCount = 0,
    unknownPremiumCount = 0,
    premiumCurrency = 'EUR',
    otherCurrencyCount = 0,
}: StatusSummaryProps) {
    const { t, language } = useLanguage()

    // The currency comes from the footprint, not a constant: `premiumCurrency`
    // is extracted from each document, so a policy written in sterling is
    // representable and the detail page already renders it as such. Hardcoding
    // EUR here labelled whatever was summed as euros.
    const premiumLabel = new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-GB', {
        style: 'currency',
        currency: premiumCurrency || 'EUR',
        maximumFractionDigits: 0,
    }).format(totalPremium)

    const excludedNote =
        unknownDurationCount > 0
            ? (unknownDurationCount === 1
                ? t.status.premiumExcludesUnknown
                : t.status.premiumExcludesUnknownPlural
            ).replace('{count}', String(unknownDurationCount))
            : undefined

    // A policy can be missing from the total for two different reasons: no
    // readable end date (excluded from "in force" entirely) or no premium
    // recorded (counted as cover, contributes 0). Both mean the figure understates
    // reality, so both are said out loud.
    const otherCurrencyNote =
        otherCurrencyCount > 0
            ? (otherCurrencyCount === 1
                ? t.status.premiumExcludesOtherCurrency
                : t.status.premiumExcludesOtherCurrencyPlural
            ).replace('{count}', String(otherCurrencyCount))
            : undefined

    const noAmountNote =
        unknownPremiumCount > 0
            ? (unknownPremiumCount === 1
                ? t.status.premiumExcludesNoAmount
                : t.status.premiumExcludesNoAmountPlural
            ).replace('{count}', String(unknownPremiumCount))
            : undefined

    // 4-up only from xl. At lg the sidebar takes ~240px, leaving ~170px per tile,
    // which truncated every hint ("1/1 προστε…"). Two-up reads properly there.
    return (
        <StatGrid className="mb-5">
            <StatTile
                label={t.status.activePolicies}
                value={activeCount}
                hint={`${activeCount}/${totalPolicies} ${t.status.added}`}
                icon={ShieldCheck}
                accent="positive"
                visual={
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                        <CompletionRing value={activeCount} total={totalPolicies} />
                        <ShieldCheck className="absolute h-4 w-4 text-primary dark:text-mint" />
                    </span>
                }
            />

            <StatTile
                label={t.policyStatus.expiringSoon}
                value={expiringCount}
                hint={t.status.within30Days}
                icon={Clock}
                accent="warning"
            />

            <StatTile
                label={t.status.attentionNeeded}
                value={attentionCount}
                hint={t.status.needsReview}
                icon={AlertTriangle}
                accent="critical"
            />

            <StatTile
                label={t.status.totalPremium}
                value={premiumLabel}
                hint={[excludedNote, noAmountNote, otherCurrencyNote].filter(Boolean).join(' · ') || undefined}
                icon={Euro}
                accent="brand"
            />
        </StatGrid>
    )
}
