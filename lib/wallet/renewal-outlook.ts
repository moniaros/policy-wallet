/**
 * Renewal outlook — what is worth checking before a policy renews, and which
 * reminders are genuinely still coming.
 *
 * Facts only. Every checklist item is backed by a recorded fact (an open gap,
 * a condition with a deadline, a compliance obligation, an auto-renewal
 * clause, a missing analysis or document). There is deliberately no premium-
 * change or coverage-change item: `renewalHistory` entries carry no premium,
 * and asserting either without data would be the fabrication this product's
 * copy tests exist to keep out.
 *
 * One module feeds BOTH the policy page's renewal card and the dashboard's
 * "points to check" chips, so the two surfaces cannot disagree on the count.
 */

import { RENEWAL_MILESTONES, BASIC_MILESTONES } from "@/lib/renewals/milestones"

export type RenewalChecklistItemKind =
    | "gaps"
    | "deadline"
    | "obligation"
    | "auto_renewal"
    | "not_analyzed"
    | "no_document"

export interface RenewalChecklistItem {
    id: RenewalChecklistItemKind
    kind: RenewalChecklistItemKind
    count?: number
}

export interface RenewalOutlookInput {
    /** Open gap instances recorded against THIS policy. */
    openGapCount: number
    /** Conditions of kind claim_deadline / notification_obligation. */
    deadlineConditionCount: number
    /** Recurring compliance obligations (ACORD v3 `conditions`; empty on v2 rows). */
    obligationCount: number
    hasAutoRenewal: boolean
    /** Null when no completed analysis is on record. */
    lastAnalyzedAt: string | Date | null
    documentCount: number
}

/** Ordered by how much each item matters before a renewal decision. */
export function deriveRenewalChecklist(input: RenewalOutlookInput): RenewalChecklistItem[] {
    const items: RenewalChecklistItem[] = []
    if (input.openGapCount > 0) {
        items.push({ id: "gaps", kind: "gaps", count: input.openGapCount })
    }
    if (input.deadlineConditionCount > 0) {
        items.push({ id: "deadline", kind: "deadline", count: input.deadlineConditionCount })
    }
    if (input.obligationCount > 0) {
        items.push({ id: "obligation", kind: "obligation", count: input.obligationCount })
    }
    if (input.hasAutoRenewal) {
        items.push({ id: "auto_renewal", kind: "auto_renewal" })
    }
    if (input.lastAnalyzedAt === null) {
        items.push({ id: "not_analyzed", kind: "not_analyzed" })
    }
    if (input.documentCount === 0) {
        items.push({ id: "no_document", kind: "no_document" })
    }
    return items
}

/**
 * The reminder milestones still genuinely ahead of this policy.
 *
 * Only milestones strictly at-or-below the remaining days are promised — a
 * milestone already passed fires (once) whenever the cron next runs, and
 * promising "we will remind you at 90 days" to a policy 20 days out would be
 * false. Tier-truthful: the free floor is the 30-day basic reminder, the full
 * ladder is paid (`notifications` entitlement) — the same constants the cron
 * sends by, imported from one module so promise and behaviour cannot drift.
 */
export function upcomingReminderMilestones(
    daysLeft: number | null,
    sentMilestones: readonly number[],
    hasFullLadder: boolean
): number[] {
    if (daysLeft === null || daysLeft < 0) return []
    const ladder = hasFullLadder ? RENEWAL_MILESTONES : BASIC_MILESTONES
    const sent = new Set(sentMilestones)
    return ladder.filter((milestone) => !sent.has(milestone) && milestone <= daysLeft)
}
