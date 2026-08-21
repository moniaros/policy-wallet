import Link from "next/link"
import { ArrowRight, CalendarClock } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { displayInsurerName } from '@/lib/wallet/policy-identity'

export interface RenewalItem {
    id: string
    insurerName: string | null
    icon: LucideIcon
    /** The row headline, resolved by the server: "Motor renewal in 24 days". */
    titleLabel: string
    endDateLabel: string
    days: number
    premiumLabel: string | null
    /** Real points to check before renewing (open gaps on THIS policy); 0 renders nothing. */
    checkpointCount: number
    /** "2 points to check" — resolved by the server; null when count is 0. */
    checkpointLabel: string | null
}

/**
 * Six-month renewal timeline on /home, with the free-tier smart-reminders
 * teaser (Trigger D). Server component — copy pre-resolved, items precomputed.
 *
 * Each row leads with what it means ("Motor renewal in 24 days") rather than
 * with the document, and links to the policy's renewal section. The checkpoint
 * chip renders only when something real was found — its absence claims nothing.
 */
export function RenewalsTimelineCard({
    items,
    hasPolicies,
    showUpgradeTeaser,
    labels,
}: {
    items: RenewalItem[]
    hasPolicies: boolean
    showUpgradeTeaser: boolean
    labels: {
        kicker: string
        policiesSuffix: string
        trackExpirationsTitle: string
        trackExpirationsBody: string
        addPolicy: string
        noExpirationsTitle: string
        noExpirationsBody: string
    }
}) {
    return (
        <div className="pw-card pw-pad">
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                {items.length > 0 && (
                    <p className="text-micro font-semibold text-muted-foreground">
                        {items.length} {labels.policiesSuffix}
                    </p>
                )}
            </div>
            <div className="mt-3">
                {items.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-3.5 dark:border-white/15 dark:bg-white/[0.03]">
                        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                            <CalendarClock className="h-4 w-4 text-primary dark:text-mint" />
                        </span>
                        <div className="min-w-0 flex-1">
                            {!hasPolicies ? (
                                <>
                                    <p className="text-sm font-semibold text-black/75 dark:text-white/85">{labels.trackExpirationsTitle}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{labels.trackExpirationsBody}</p>
                                    <Link
                                        href="/wallet/add"
                                        className="pw-inline-action mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                                    >
                                        {labels.addPolicy}
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-black/75 dark:text-white/85">{labels.noExpirationsTitle}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{labels.noExpirationsBody}</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => {
                            const urgencyColor = item.days <= 30 ? "bg-rose-500" : item.days <= 89 ? "bg-amber-500" : "bg-primary"

                            return (
                                <Link
                                    key={item.id}
                                    href={`/wallet/${item.id}#renewal`}
                                    className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.03] p-2.5 transition hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                >
                                    <div className={`h-8 w-1 flex-shrink-0 rounded-full ${urgencyColor}`} aria-hidden />
                                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-white text-black/70 dark:bg-black dark:text-white/70">
                                        <item.icon className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                            {item.titleLabel}
                                        </p>
                                        <p className="truncate text-micro text-black/60 dark:text-white/55">
                                            {[displayInsurerName(item.insurerName), item.endDateLabel, item.premiumLabel]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        {item.checkpointLabel && (
                                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-micro font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                {item.checkpointLabel}
                                            </span>
                                        )}
                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
                {/* Trigger D: smart renewal reminders teaser for free tier */}
                {showUpgradeTeaser && (
                    <UpgradeTriggerCard
                        featureKey="advanced_renewal_reminders"
                        triggerSource="home_renewals"
                        returnTo="/home"
                        variant="inline"
                        className="mt-3"
                    />
                )}
            </div>
        </div>
    )
}
