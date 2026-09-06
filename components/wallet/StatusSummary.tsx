"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardHead } from '@/components/dashboard/home/CardHead'
import { premiumExclusionParts } from '@/lib/wallet/premium-exclusion-note'
import { resolveLocale } from "@/lib/i18n/format"

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
    const premiumLabel = new Intl.NumberFormat(resolveLocale(language), {
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

    // Cell recipes — the dashboard hero's phone grammar (the Steady layer):
    // the active count is the headline number and the other three ride in
    // one ink panel; from lg the four are the same fact cells with hairlines
    // between (the panel is `contents` there, so the cells are the grid's own
    // children again). Numbers inside the panel inherit its white; the
    // amber-on-expiring cue is a desktop-only refinement because amber on
    // ink does not clear 4.5:1.
    const lead = 'flex min-w-0 flex-col gap-1 lg:pr-4'
    const cell = 'flex min-w-0 flex-col gap-1 rounded-2xl bg-background/10 px-3.5 py-3 text-background lg:rounded-none lg:border-l lg:border-border lg:bg-transparent lg:p-0 lg:pl-4 lg:pr-4 lg:text-foreground lg:last:pr-0'
    const leadLabel = 'text-caption leading-snug text-muted-foreground'
    const label = 'text-caption leading-snug lg:text-muted-foreground'
    const leadNumber = 'text-display font-semibold leading-none tracking-tight tabular-nums text-foreground lg:text-title'
    const number = 'text-title font-semibold leading-none tracking-tight tabular-nums'
    const leadSub = 'text-caption leading-snug text-muted-foreground'
    const sub = 'text-caption leading-snug lg:text-muted-foreground'

    return (
        <section className="pw-card pw-pad mb-4" aria-labelledby="wallet-overview-heading">
            <CardHead icon={Wallet} title={t.wallet.overview} id="wallet-overview-heading" />

            <div className="mt-5 flex flex-col gap-4 lg:grid lg:grid-cols-4 lg:gap-0">
                {/* «Ενεργή προστασία» is the STRICT lifecycle state (in force,
                    >30 days out, identity complete) — NOT the same fact as
                    coverage-insights' «Σε ισχύ σήμερα», which also counts
                    expiring/unreadable cover. Separate keys, and each label
                    says which it is. The five dashboard hero facts are not a
                    partition of the total either (§2.8). */}
                <div className={lead}>
                    <p className={leadLabel}>{t.status.activePolicies}</p>
                    <p className={leadNumber}>
                        <span data-count="portfolio.activeCount">{activeCount}</span>
                    </p>
                    <p className={leadSub}>
                        <span data-count="portfolio.policyCount">{totalPolicies}</span>
                        {` ${t.status.added}`}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-1.5 rounded-3xl bg-foreground p-1.5 sm:grid-cols-3 lg:contents">
                    {/* The 30-day window, stated under the number — the same fact
                        and the same window as the dashboard hero's «λήγουν μέσα σε
                        30 ημέρες»; the risk watch's 45-day look-ahead is a
                        DIFFERENT key. Amber only when there is something expiring:
                        a zero in the warning colour is an alarm about nothing. */}
                    <div className={cell}>
                        <p className={label}>{t.status.expiringSoon}</p>
                        <p className={cn(number, expiringCount > 0 ? 'lg:text-status-warning' : 'lg:text-foreground')}>
                            <span data-count="portfolio.expiringCount">{expiringCount}</span>
                        </p>
                        <p className={sub}>{t.status.within30Days}</p>
                    </div>

                    <div className={cell}>
                        <p className={label}>{t.status.attentionNeeded}</p>
                        <p className={cn(number, 'lg:text-foreground')}>
                            <span data-count="portfolio.attentionCount">{attentionCount}</span>
                        </p>
                        <p className={sub}>{t.status.needsReview}</p>
                    </div>

                    <div className={cell}>
                        <p className={label}>{t.status.totalPremium}</p>
                        <p className={cn(number, 'lg:text-foreground')}>
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
            </div>
        </section>
    )
}
