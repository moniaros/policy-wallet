"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { AlertTriangle, Clock, Euro, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatTile, StatGrid } from "@/components/ui/StatTile"
import { premiumExclusionParts } from '@/lib/wallet/premium-exclusion-note'

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

    // A policy can be missing from the total for three different reasons: no
    // readable end date (excluded from "in force" entirely), no premium
    // recorded (counted as cover, contributes 0), or another currency. All mean
    // the figure understates reality, so all are said out loud — through the
    // SAME parts helper the dashboard's portfolio card uses, one clause per
    // count, each carrying its data-count key.
    const excludedParts = premiumExclusionParts(
        { otherCurrencyCount, unknownPremiumCount, unknownDurationCount },
        t.status
    )

    // 4-up only from xl. At lg the sidebar takes ~240px, leaving ~170px per tile,
    // which truncated every hint ("1/1 προστε…"). Two-up reads properly there.
    return (
        <StatGrid className="mb-5">
            {/* «Ενεργά» is the STRICT lifecycle state (in force, >30 days out,
                identity complete) — NOT the same fact as coverage-insights'
                «Σε ισχύ σήμερα», which also counts expiring/unreadable cover.
                Separate keys, and each label says which it is. NOTE the five
                dashboard hero facts are not a partition of the total: «29 − 5
                ληγμένα − 5 λήγουν − 2 μη αναλυμένα» is not this number (§2.8) —
                the analysis facts overlap the lifecycle ones freely. */}
            <StatTile
                label={t.status.activePolicies}
                value={<span data-count="portfolio.activeCount">{activeCount}</span>}
                hint={
                    <>
                        <span data-count="portfolio.activeCount">{activeCount}</span>
                        /
                        <span data-count="portfolio.policyCount">{totalPolicies}</span>
                        {` ${t.status.added}`}
                    </>
                }
                icon={ShieldCheck}
                accent="positive"
                visual={
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                        <CompletionRing value={activeCount} total={totalPolicies} />
                        <ShieldCheck className="absolute h-4 w-4 text-primary dark:text-mint" />
                    </span>
                }
            />

            {/* The 30-day window, stated in the hint — the same fact and the
                same window as the dashboard hero's «λήγουν μέσα σε 30 ημέρες»;
                the risk watch's 45-day look-ahead is a DIFFERENT key. */}
            <StatTile
                label={t.policyStatus.expiringSoon}
                value={<span data-count="portfolio.expiringCount">{expiringCount}</span>}
                hint={t.status.within30Days}
                icon={Clock}
                accent="warning"
            />

            <StatTile
                label={t.status.attentionNeeded}
                value={<span data-count="portfolio.attentionCount">{attentionCount}</span>}
                hint={t.status.needsReview}
                icon={AlertTriangle}
                accent="critical"
            />

            <StatTile
                label={t.status.totalPremium}
                value={<span data-fact="portfolio.totalAnnualPremium">{premiumLabel}</span>}
                hint={
                    excludedParts.length > 0 ? (
                        <>
                            {excludedParts.map((part, i) => (
                                <span key={part.countKey}>
                                    {i > 0 && <span aria-hidden> · </span>}
                                    <span data-count={part.countKey}>{part.label}</span>
                                </span>
                            ))}
                        </>
                    ) : undefined
                }
                icon={Euro}
                accent="brand"
            />
        </StatGrid>
    )
}
