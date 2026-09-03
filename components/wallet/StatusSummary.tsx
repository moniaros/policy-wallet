"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardHead } from '@/components/dashboard/home/CardHead'
import { premiumExclusionParts } from '@/lib/wallet/premium-exclusion-note'

interface StatusSummaryProps {
    activeCount: number
    expiringCount: number
    /** action_needed + unknown_duration + expired — everything the user should look at. */
    attentionCount: number
    /** Everything in the wallet, expired policies included. */
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

/**
 * The wallet's overview row — Direction A (2026-09-03).
 *
 * Four KPI tiles with accent chips and a completion ring became ONE card with
 * one fact per cell, the same anatomy as the dashboard's overview
 * (ProtectionStatusHero): words small over the number large, hairlines
 * between cells from lg. The ring is gone — a gauge invites reading a ratio
 * as a grade, and «3 of 5 active» is a count, not a score. Every count keeps
 * its registered data-count key, rendered exactly once (the old active tile
 * rendered activeCount twice: as the number and again in its own hint).
 */
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

    const cell = 'flex min-w-0 flex-col gap-1'
    const label = 'text-caption leading-snug text-muted-foreground'
    const number = 'text-title font-semibold leading-none tracking-tight tabular-nums'
    const sub = 'text-caption leading-snug text-muted-foreground'

    return (
        <section className="pw-card pw-pad mb-4" aria-labelledby="wallet-overview-heading">
            <CardHead icon={Wallet} title={t.wallet.overview} id="wallet-overview-heading" />

            {/* Hairlines between cells at lg+ only: below that the row wraps
                two-up, and a divider at a wrapped row's start is a line with
                nothing to its left. */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4 lg:gap-x-0 lg:[&>*+*]:border-l lg:[&>*+*]:border-border lg:[&>*+*]:pl-4 lg:[&>*]:pr-4 lg:[&>*:last-child]:pr-0">
                {/* «Ενεργή προστασία» is the STRICT lifecycle state (in force,
                    >30 days out, identity complete) — NOT the same fact as
                    coverage-insights' «Σε ισχύ σήμερα», which also counts
                    expiring/unreadable cover. Separate keys, and each label
                    says which it is. The five dashboard hero facts are not a
                    partition of the total either (§2.8). */}
                <div className={cell}>
                    <p className={label}>{t.status.activePolicies}</p>
                    <p className={cn(number, 'text-foreground')}>
                        <span data-count="portfolio.activeCount">{activeCount}</span>
                    </p>
                    <p className={sub}>
                        <span data-count="portfolio.policyCount">{totalPolicies}</span>
                        {` ${t.status.added}`}
                    </p>
                </div>

                {/* The 30-day window, stated under the number — the same fact
                    and the same window as the dashboard hero's «λήγουν μέσα σε
                    30 ημέρες»; the risk watch's 45-day look-ahead is a
                    DIFFERENT key. Amber only when there is something expiring:
                    a zero in the warning colour is an alarm about nothing. */}
                <div className={cell}>
                    <p className={label}>{t.status.expiringSoon}</p>
                    <p className={cn(number, expiringCount > 0 ? 'text-status-warning' : 'text-foreground')}>
                        <span data-count="portfolio.expiringCount">{expiringCount}</span>
                    </p>
                    <p className={sub}>{t.status.within30Days}</p>
                </div>

                <div className={cell}>
                    <p className={label}>{t.status.attentionNeeded}</p>
                    <p className={cn(number, 'text-foreground')}>
                        <span data-count="portfolio.attentionCount">{attentionCount}</span>
                    </p>
                    <p className={sub}>{t.status.needsReview}</p>
                </div>

                <div className={cell}>
                    <p className={label}>{t.status.totalPremium}</p>
                    <p className={cn(number, 'text-foreground')}>
                        <span data-fact="portfolio.totalAnnualPremium">{premiumLabel}</span>
                    </p>
                    {excludedParts.length > 0 && (
                        <p className={sub}>
                            {excludedParts.map((part, i) => (
                                <span key={part.countKey}>
                                    {i > 0 && <span aria-hidden> · </span>}
                                    <span data-count={part.countKey}>{part.label}</span>
                                </span>
                            ))}
                        </p>
                    )}
                </div>
            </div>
        </section>
    )
}
