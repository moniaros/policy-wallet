/**
 * The Personal Life Timeline — vocabulary.
 *
 * Specification: docs/architecture/personal-life-timeline.md
 *
 * The timeline's job is not to list what happened. It is to answer **why this
 * recommendation is on my screen** and **why did my score move**, which the
 * product could previously answer only with "the engine decided". Every entry
 * therefore carries where it came from, and the two entry kinds that make claims
 * about the customer — recommendations and score changes — carry a link to the
 * entry that caused them.
 *
 * **Claims are absent by construction.** The mission that specified this timeline
 * lists claims among its sources, and this product has no claims model: no table,
 * no thread category, nothing. Rather than add an entry kind nothing can ever
 * produce — an unreachable state is a defect, not a placeholder — the kind is
 * simply not here. Adding it later is one entry in the source registry.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

/**
 * What kinds of thing appear on the timeline.
 *
 * Every one of these has a real source behind it (§service.ts). Nothing is here
 * speculatively.
 */
export const TIMELINE_KINDS = [
    /** The customer declared a change in their life. */
    "life_event",
    /** A policy entered the wallet. */
    "policy_added",
    /** Cover started, lapsed or changed hands. */
    "coverage_change",
    /** A renewal came due, or was resolved. */
    "renewal",
    /** A risk opened, closed, or changed priority. */
    "risk_change",
    /** The protection score moved. */
    "score_change",
    /** Something was recommended. */
    "recommendation",
    /** An advisor did something on the customer's behalf. */
    "advisor_action",
] as const
export type TimelineKind = (typeof TIMELINE_KINDS)[number]

/**
 * Why an entry exists, pointing at the entry that caused it.
 *
 * `entryId` is a timeline entry, so the UI can scroll to the cause and the
 * reader can check the claim. `explanation` states the link in words, because a
 * line drawn between two rows is not an explanation.
 */
export interface TimelineCause {
    entryId: string
    explanation: Bilingual
}

export interface TimelineEntry {
    /** Stable across rebuilds: `<kind>:<source row id>`. */
    id: string
    kind: TimelineKind
    at: Date
    title: Bilingual
    detail: Bilingual | null
    /**
     * What caused this. Null is a legitimate answer for entries that ARE causes
     * (a declared life event, a policy upload) and for findings that predate the
     * version history — never a silent gap.
     */
    cause: TimelineCause | null
    /**
     * Score movement, on `score_change` entries. Negative is a fall.
     * Null when the score was indeterminate on either side, because a delta
     * against a number the customer was never shown is a movement that never
     * happened.
     */
    delta?: number | null
    /** The risk this concerns, where there is one — for cross-linking. */
    riskId?: string | null
    /** Where to go to act on it. */
    href?: string | null
}

/** Newest first — the timeline is read from today backwards. */
export function byNewestFirst(a: TimelineEntry, b: TimelineEntry): number {
    const byTime = b.at.getTime() - a.at.getTime()
    // Stable tiebreak so a rebuild cannot reorder two entries at the same
    // instant, which happens constantly: an upload and the score change it
    // caused share a timestamp to the second.
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id)
}
