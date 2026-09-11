"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, ChevronDown, Lock, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { CardHead } from "@/components/dashboard/home/CardHead"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { updateGapStatus } from "@/app/(protected)/protection/actions"
import type { ProvenanceLine } from "@/lib/gaps/findings-provenance"

/**
 * «Τι αξίζει να δείτε» — the page's most important block (Goal 6). Each
 * finding is explained, not merely listed: what it means for the person
 * (the rule's authored description — never generated prose), why it matters
 * (the provenance class as a plain sentence, beside the class label and its
 * citation), which area of life it concerns, and one action. Findings still
 * under review are disclosed in a closed group with no number in any
 * heading; the free plan's cap is disclosed as «+N ακόμη» so nobody believes
 * the visible ones are all. The list names the run it came from.
 */
export interface GapItemView {
    id: string
    policyId: string | null
    title: string
    meaning: string | null
    why: string
    provenanceLabel: string
    area: string | null
    branch: string
}

export interface GapListCopy {
    title: string
    lead: string
    meaning: string
    why: string
    concerns: string
    review: string
    dismiss: string
    dismissed: string
    dismissFailed: string
    more: string
    moreOne: string
    underReviewTitle: string
    underReviewDisclosure: string
    /** W2-02: findings whose value the document did not confirm — disclosed, never counted. Optional for callers that render no such group. */
    unverifiedTitle?: string
    unverifiedDisclosure?: string
    allClear: string
    allClearOne: string
    allClearExcluded: string
    allClearExcludedOne: string
    notAnalysed: string
    notAnalysedHint: string
    notAnalysedLocked: string
    noPolicies: string
    excludedExpiredTitle: string
    excludedExpiredBody: string
}

export interface GapListProps {
    items: GapItemView[]
    underReview: GapItemView[]
    /** W2-02: below the definition's evidence floor — the document did not confirm the value the rule fired on. */
    unverified?: GapItemView[]
    /** How many classified items the plan lets a reader see; null = all. */
    visibleLimit: number | null
    provenanceLine: ProvenanceLine | null
    state: "no_policies" | "not_analysed" | "clear" | "findings"
    isDeepAnalysisLocked: boolean
    assessedCount: number
    excludedCount: number
    excludedExpired: string[]
    copy: GapListCopy
}

export function GapList({ items, underReview, unverified = [], visibleLimit, provenanceLine, state, isDeepAnalysisLocked, assessedCount, excludedCount, excludedExpired, copy }: GapListProps) {
    const [hidden, setHidden] = useState<Set<string>>(new Set())
    const live = items.filter((i) => !hidden.has(i.id))
    const visible = visibleLimit === null ? live : live.slice(0, visibleLimit)
    const lockedCount = live.length - visible.length

    async function dismiss(id: string) {
        setHidden((prev) => new Set(prev).add(id))
        try {
            await updateGapStatus(id, "dismissed")
            toast.success(copy.dismissed)
        } catch {
            setHidden((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            toast.error(copy.dismissFailed)
        }
    }

    const toneClass = provenanceLine?.tone === "warning" ? "text-status-warning" : "text-muted-foreground"

    return (
        <section id="gaps" aria-labelledby="protection-gaps-heading" className="pw-card pw-pad scroll-mt-20">
            <CardHead icon={ShieldAlert} title={copy.title} id="protection-gaps-heading" />
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.lead}</p>

            {provenanceLine && state !== "no_policies" && state !== "not_analysed" && (
                <p className={`mt-3 text-caption leading-snug ${toneClass}`} data-fact="gap.findingsProvenance" data-provenance-state={provenanceLine.state}>
                    {provenanceLine.text}
                </p>
            )}

            {excludedExpired.length > 0 && (
                <div className="mt-4 flex items-start gap-3 rounded-xl bg-status-warning-tint p-3.5">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-status-warning">{copy.excludedExpiredTitle}</p>
                        <p className="mt-0.5 text-caption leading-relaxed text-foreground/80">{copy.excludedExpiredBody.replace("{list}", excludedExpired.join(" · "))}</p>
                    </div>
                </div>
            )}

            {state === "no_policies" && <p className="mt-4 text-sm text-muted-foreground">{copy.noPolicies}</p>}

            {state === "not_analysed" && (
                <div className="pw-subcard mt-4 p-3.5" data-assessment-state="not_analysed">
                    <div className="flex items-start gap-3">
                        <span className="pw-card-chip" aria-hidden="true">
                            <Lock className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{copy.notAnalysed}</p>
                            <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.notAnalysedHint}</p>
                        </div>
                    </div>
                    {isDeepAnalysisLocked && (
                        <Link href="/upgrade?reason=feature_locked" className="pw-soft-button mt-3">
                            {copy.notAnalysedLocked}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}

            {state === "clear" && (
                <div className="pw-subcard mt-4 flex items-start gap-3 p-3.5" data-assessment-state="assessed">
                    <span className="pw-card-chip" aria-hidden="true">
                        <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                        <Link href="/wallet" data-count="portfolio.assessedCount" className="hover:underline">
                            {assessedCount === 1 ? copy.allClearOne : copy.allClear.replace("{assessed}", String(assessedCount))}
                        </Link>
                        {excludedCount > 0 && (
                            <>
                                {" "}
                                <Link href="/protection?status=not_checked#categories" data-count="portfolio.unassessedCount" className="text-muted-foreground hover:underline">
                                    {excludedCount === 1 ? copy.allClearExcludedOne : copy.allClearExcluded.replace("{n}", String(excludedCount))}
                                </Link>
                            </>
                        )}
                    </p>
                </div>
            )}

            {state === "findings" && visible.length > 0 && (
                <ul className="mt-4 space-y-3" data-list="findings">
                    {visible.map((item) => (
                        <li key={item.id} className="pw-subcard p-4" data-gap-id={item.id}>
                            <h3 className="text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{item.title}</h3>
                            <p className="mt-1 text-caption text-muted-foreground">
                                {item.branch}
                                {item.area ? ` · ${copy.concerns.replace("{area}", item.area)}` : ""}
                            </p>
                            {item.meaning && (
                                <div className="mt-3">
                                    <p className="text-caption font-semibold text-foreground">{copy.meaning}</p>
                                    <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">{item.meaning}</p>
                                </div>
                            )}
                            <div className="mt-3">
                                <p className="text-caption font-semibold text-foreground">{copy.why}</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">{item.why}</p>
                                <p className="mt-0.5 text-caption leading-snug text-muted-foreground" data-fact="gap.provenance">
                                    {item.provenanceLabel}
                                </p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                {item.policyId && (
                                    <Link href={`/wallet/${item.policyId}`} className="pw-soft-button">
                                        {copy.review}
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                )}
                                <button type="button" onClick={() => dismiss(item.id)} className="pw-inline-action inline-flex min-h-11 items-center text-caption font-medium text-muted-foreground hover:underline">
                                    {copy.dismiss}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* «Τι σημαίνει για εσάς» is the model's description of a
                rule-decided gap: the disclaimer sits with it, not at the foot. */}
            {state === "findings" && visible.length > 0 && <AiDisclaimer variant="inline" className="mt-3" />}

            {lockedCount > 0 && (
                <Link href="/upgrade?reason=feature_locked" data-count="gap.lockedCount" className="pw-soft-button mt-3">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    {lockedCount === 1 ? copy.moreOne : copy.more.replace("{n}", String(lockedCount))}
                </Link>
            )}

            {underReview.length > 0 && (
                <details className="group/review mt-4 rounded-xl bg-muted/60" data-provenance-group="under_review">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-foreground">{copy.underReviewTitle}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/review:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="px-3.5 pb-3.5">
                        <p className="text-caption leading-relaxed text-muted-foreground">{copy.underReviewDisclosure}</p>
                        <ul className="mt-2 divide-y divide-border" data-list="under_review">
                            {underReview.map((item) => (
                                <li key={item.id} className="py-2 text-sm text-foreground" data-gap-id={item.id}>
                                    <span className="font-medium">{item.title}</span>
                                    <span className="text-muted-foreground"> · {item.branch}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </details>
            )}

            {unverified.length > 0 && copy.unverifiedTitle && copy.unverifiedDisclosure && (
                // W2-02: the same disclosed treatment as under-review provenance, for a
                // different reason — the document did not confirm what the rule read.
                <details className="group/unverified mt-4 rounded-xl bg-muted/60" data-provenance-group="unverified">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-foreground">{copy.unverifiedTitle}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/unverified:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="px-3.5 pb-3.5">
                        <p className="text-caption leading-relaxed text-muted-foreground">{copy.unverifiedDisclosure}</p>
                        <ul className="mt-2 divide-y divide-border" data-list="unverified">
                            {unverified.map((item) => (
                                <li key={item.id} className="py-2 text-sm text-foreground" data-gap-id={item.id}>
                                    <span className="font-medium">{item.title}</span>
                                    <span className="text-muted-foreground"> · {item.branch}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </details>
            )}
        </section>
    )
}
