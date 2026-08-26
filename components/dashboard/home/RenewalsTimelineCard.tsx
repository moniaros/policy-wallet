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
    /** The policy number, scrubbed of sentinels — null when there isn't one. */
    policyRef?: string | null
    /**
     * The asset identifier — plate / address short form / pet's name —
     * resolved by the server through `policyAssetIdentifier`
     * (lib/wallet/policy-identity.ts), the ONE module that knows which field
     * identifies which line. When present it replaces the policy number on
     * the row: «ΙΖΤ-1234» is how the owner knows the car, «SYMB-2025-MOT-…»
     * is how the insurer files it. Null for lines with no identifier
     * (health, life, …) — those rows keep the policy number, unchanged.
     */
    assetLabel?: string | null
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
    totalCount,
    hasPolicies,
    showUpgradeTeaser,
    labels,
}: {
    items: RenewalItem[]
    /**
     * Renewals in the 180-day window — the FACT the header states. `items` is
     * capped at six rows, and the header used to render `items.length`, so
     * eight upcoming renewals read as «6 ασφαλιστήρια»: the header counted the
     * truncation, not the portfolio.
     */
    totalCount?: number
    hasPolicies: boolean
    showUpgradeTeaser: boolean
    labels: {
        kicker: string
        policiesSuffixOne: string
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
                        {/* A DIFFERENT key from portfolio.policyCount on purpose:
                            this counts renewals in the 180-day window, not the
                            wallet — and the suffix label states the window, so
                            the difference is readable, not just machine-checkable.
                            (`renewals.upcoming` was this key's pre-plan spelling;
                            the plan registers portfolio.renewalsNext180Count.) */}
                        <span data-count="portfolio.renewalsNext180Count">{totalCount ?? items.length}</span>{" "}
                        {(totalCount ?? items.length) === 1 ? labels.policiesSuffixOne : labels.policiesSuffix}
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
                                    href={`/wallet/${item.id}#dates`}
                                    className="pw-control-boundary flex items-center gap-3 rounded-xl border bg-black/[0.03] p-2.5 transition hover:bg-black/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                >
                                    <div className={`h-8 w-1 flex-shrink-0 rounded-full ${urgencyColor}`} aria-hidden />
                                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-white text-black/70 dark:bg-black dark:text-white/70">
                                        <item.icon className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className="text-xs font-semibold text-black dark:text-white [overflow-wrap:anywhere]"
                                            // «Ανανέωση αυτοκινήτου σε 24 ημέρες» —
                                            // a fact rendered as prose is still a
                                            // fact (plan rule 3); the subject keeps
                                            // six rows from reading as one key
                                            // disagreeing with itself.
                                            data-fact="policy.daysRemaining"
                                            data-fact-subject={item.id}
                                        >
                                            {item.titleLabel}
                                        </p>
                                        {/* D7 + D11 in ONE line that may wrap to two.
                                            Was a single `truncate` row, so the insurer —
                                            the thing that identifies the policy — was the
                                            first casualty («Εθνική Ασφαλιστικ…»). Wrapping
                                            it freely cost 873px of scroll on the heavy
                                            fixture, because two of those names are 57
                                            characters of legal boilerplate. Two lines is
                                            the compromise: the insurer and the policy
                                            number both fit, and the row cannot run away. */}
                                        <p className="line-clamp-2 text-micro text-black/65 dark:text-white/60 [overflow-wrap:anywhere]">
                                            {/* Spans, not a pre-joined string: each
                                                part is a distinct policy fact and
                                                carries its own attribute. */}
                                            {(
                                                [
                                                    { factKey: "policy.insurer", value: displayInsurerName(item.insurerName) },
                                                    // The asset identifier when one exists, else the
                                                    // policy number — never both: one identity slot,
                                                    // filled by the thing the customer recognizes
                                                    // (P5-wallet-01, via lib/wallet/policy-identity).
                                                    item.assetLabel
                                                        ? { factKey: "asset.identifier", value: item.assetLabel }
                                                        : { factKey: "policy.number", value: item.policyRef },
                                                    { factKey: "policy.endDate", value: item.endDateLabel },
                                                    { factKey: "policy.premium", value: item.premiumLabel },
                                                ] as const
                                            )
                                                .filter((part) => Boolean(part.value))
                                                .map((part, i) => (
                                                    <span key={part.factKey}>
                                                        {i > 0 && <span aria-hidden> · </span>}
                                                        <span data-fact={part.factKey} data-fact-subject={item.id}>
                                                            {part.value}
                                                        </span>
                                                    </span>
                                                ))}
                                        </p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        {item.checkpointLabel && (
                                            <span
                                                data-count="policy.renewalCheckpointCount"
                                                data-count-subject={item.id}
                                                className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-micro font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                                            >
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
