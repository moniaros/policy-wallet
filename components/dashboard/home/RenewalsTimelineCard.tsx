import Link from "next/link"
import { ArrowRight, CalendarClock } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { displayInsurerName } from '@/lib/wallet/policy-identity'
import { CardHead } from "./CardHead"

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
    /**
     * True when another row shares this asset identifier — then the policy
     * number renders BESIDE it, so two contracts on one plate stay two rows.
     */
    showPolicyRef?: boolean
    /** "2 points to check" — resolved by the server; null when count is 0. */
    checkpointLabel: string | null
    /**
     * How far through its term the policy is, 0–100, from the document's own
     * start and end dates — the reference's progress bar, carrying a fact the
     * policy states rather than money. Null when either date is unreadable,
     * and then no bar renders (an empty track would claim a term we lack).
     */
    termProgressPct?: number | null
    /** «Από 07/09/2025» — the term's start, Athens-formatted; null hides it. */
    termStartLabel?: string | null
    /** Accessible name for the bar: «Διάρκεια {start} έως {end}». */
    termAria?: string | null
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
     * capped, and the header used to render `items.length`, so
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
        noExpirationsTitle: string
        noExpirationsBody: string
    }
}) {
    const count = totalCount ?? items.length
    return (
        <section className="pw-card pw-pad" aria-labelledby="renewals-heading">
            <CardHead
                icon={CalendarClock}
                title={labels.kicker}
                id="renewals-heading"
                meta={
                    items.length > 0 ? (
                        /* A DIFFERENT key from portfolio.policyCount on purpose:
                           this counts renewals in the 180-day window, not the
                           wallet — and the suffix label states the window, so
                           the difference is readable, not just machine-checkable.
                           (`renewals.upcoming` was this key's pre-plan spelling;
                           the plan registers portfolio.renewalsNext180Count.)
                           The attribute sits on the WHOLE phrase: the suffix states
                           the window («…εντός 6 μηνών») and its 6 is copy, not a
                           count — inside the instrumented element it is measured
                           context (the collector extracts the FIRST number, the
                           count), outside it it reads as an anonymous numeral. */
                        <span data-count="portfolio.renewalsNext180Count" className="text-caption font-medium text-muted-foreground">
                            {count} {count === 1 ? labels.policiesSuffixOne : labels.policiesSuffix}
                        </span>
                    ) : undefined
                }
            />
            <div className="mt-4">
                {items.length === 0 ? (
                    <div className="pw-subcard flex items-start gap-3 p-3.5">
                        <span className="pw-card-chip">
                            <CalendarClock className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            {!hasPolicies ? (
                                <>
                                    <p className="text-sm font-semibold text-foreground">{labels.trackExpirationsTitle}</p>
                                    {/* No «Προσθέστε ασφαλιστήριο» link here. On an empty
                                        wallet this card, the portfolio card and the hero
                                        all offered the same upload — three asks on a
                                        three-screen page, measured as a gated duplicate
                                        (§11 metric 7, href:/wallet/add ×2 + the hero's
                                        data-action). The empty state's ONE primary is
                                        the hero CTA; this card explains what the
                                        timeline will do, it does not re-ask. */}
                                    <p className="mt-0.5 text-xs text-muted-foreground">{labels.trackExpirationsBody}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-foreground">{labels.noExpirationsTitle}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{labels.noExpirationsBody}</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => {
                            // Inside the 30-day window the bar fills amber — the same
                            // amber-500 the severity dots use, because "expiring soon"
                            // is a warning status and that is the one colour the role
                            // owns (the role's TEXT token is far too dark for a fill).
                            // Everything further out is brand green. No rose: an
                            // approaching date is not a gap.
                            // Outside that window the bar is a neutral step: the term
                            // elapsed is information, not a state, and brand green is
                            // kept for the three things it means on this page.
                            const fill = item.days <= 30 ? "bg-amber-500" : "bg-neutral-400"

                            return (
                                <Link
                                    key={item.id}
                                    href={`/wallet/${item.id}#dates`}
                                    className="pw-subcard grid gap-2 p-3.5 transition-colors"
                                >
                                    <span className="flex items-start gap-3">
                                        <span className="pw-card-chip mt-0.5">
                                            <item.icon className="h-4 w-4" aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className="block text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]"
                                                // «Ανανέωση αυτοκινήτου σε 24 ημέρες» —
                                                // a fact rendered as prose is still a
                                                // fact (plan rule 3); the subject keeps
                                                // six rows from reading as one key
                                                // disagreeing with itself.
                                                data-fact="policy.daysRemaining"
                                                data-fact-subject={item.id}
                                            >
                                                {item.titleLabel}
                                            </span>
                                            {/* D7 + D11 in ONE line that may wrap to two.
                                                Was a single `truncate` row, so the insurer —
                                                the thing that identifies the policy — was the
                                                first casualty («Εθνική Ασφαλιστικ…»). Wrapping
                                                it freely cost 873px of scroll on the heavy
                                                fixture, because two of those names are 57
                                                characters of legal boilerplate. Two lines is
                                                the compromise: the insurer and the policy
                                                number both fit, and the row cannot run away. */}
                                            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
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
                                                        // …unless two rows share the identifier (D11): then
                                                        // the number returns as a second, distinct fact.
                                                        item.assetLabel && item.showPolicyRef
                                                            ? { factKey: "policy.number", value: item.policyRef }
                                                            : { factKey: "policy.number", value: null },
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
                                            </span>
                                        </span>
                                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                                    </span>

                                    {/* The term bar — the one progress element the page
                                        earns, because both ends of it are dates printed on
                                        the document. */}
                                    {item.termProgressPct !== null && item.termProgressPct !== undefined && (
                                        <span className="block pl-12">
                                            <span
                                                role="img"
                                                aria-label={item.termAria ?? undefined}
                                                className="block h-1.5 w-full overflow-hidden rounded-full bg-card"
                                            >
                                                <span
                                                    className={`block h-full rounded-full ${fill}`}
                                                    style={{ width: `${Math.max(2, Math.min(100, item.termProgressPct))}%` }}
                                                />
                                            </span>
                                            {item.termStartLabel && (
                                                <span className="mt-1 block text-caption text-muted-foreground">{item.termStartLabel}</span>
                                            )}
                                        </span>
                                    )}

                                    {/* The checkpoint chip lives in the CONTENT column, not in
                                        a right-hand cluster beside the arrow (P5 finding: as a
                                        flex sibling it took its width off the title first). */}
                                    {item.checkpointLabel && (
                                        <span className="pl-12">
                                            <span
                                                data-count="policy.renewalCheckpointCount"
                                                data-count-subject={item.id}
                                                className="inline-flex items-center rounded-full bg-status-warning-tint px-2 py-0.5 text-caption font-semibold text-status-warning"
                                            >
                                                {item.checkpointLabel}
                                            </span>
                                        </span>
                                    )}
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
        </section>
    )
}
