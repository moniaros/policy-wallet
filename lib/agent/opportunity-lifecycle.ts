/**
 * Opportunity lifecycle — stage transitions and structured close outcomes.
 *
 * `Opportunity.status` is a single mutable column. Writing it directly loses the
 * previous stage, so every caller that moves a deal must go through
 * `recordStageTransition` to leave an append-only `OpportunityStageHistory` row
 * behind. That log is what makes time-in-stage, funnel velocity and
 * forecast-vs-actual computable — none of which can be backfilled, because the
 * transitions were never recorded before this existed.
 *
 * Closing a deal additionally stamps `outcome` / `outcomeNotes` / `outcomeAt`,
 * mirroring the shape `PolicyRenewal` already proved out.
 */

import {
    isTerminalOpportunityStatus,
    isOpportunityOutcomeFor,
    type OpportunityStatus,
    type OpportunityOutcome,
    type OpportunityLostOutcome,
} from "@/types/enums"

/**
 * The proposal-response UI collects this decline taxonomy from the client. It
 * maps 1:1 onto pipeline loss reasons so a decline closes the deal with a real,
 * queryable reason instead of prose in a chat message.
 */
export const PROPOSAL_DECLINE_TO_LOST_OUTCOME: Record<string, OpportunityLostOutcome> = {
    too_expensive: "too_expensive",
    not_needed: "not_needed",
    prefer_different: "prefer_different",
    other: "other",
}

/** Loss reason for a client decline, defaulting to `other` for unknown input. */
export function lostOutcomeFromDeclineReason(reason?: string | null): OpportunityLostOutcome {
    if (!reason) return "other"
    return PROPOSAL_DECLINE_TO_LOST_OUTCOME[reason] ?? "other"
}

export interface CloseFields {
    outcome: OpportunityOutcome | null
    outcomeNotes: string | null
    outcomeAt: Date | null
}

/**
 * The `outcome` / `outcomeNotes` / `outcomeAt` to persist for a transition into
 * `toStatus`.
 *
 * Moving to a terminal stage stamps the close; moving back OUT of one clears it,
 * so a deal reopened after being marked lost does not keep a stale close date
 * that would double-count it in won/lost reporting.
 *
 * An outcome that does not belong to the target stage (e.g. `too_expensive` on a
 * win) is dropped rather than stored — a wrong reason is worse than none.
 */
export function buildCloseFields(
    toStatus: OpportunityStatus,
    outcome?: string | null,
    outcomeNotes?: string | null,
    now: Date = new Date()
): CloseFields {
    if (!isTerminalOpportunityStatus(toStatus)) {
        return { outcome: null, outcomeNotes: null, outcomeAt: null }
    }

    const valid = outcome && isOpportunityOutcomeFor(toStatus, outcome) ? outcome : null

    return {
        outcome: valid,
        outcomeNotes: outcomeNotes?.trim() || null,
        outcomeAt: now,
    }
}

/**
 * Minimal structural shape of the Prisma client surface this module writes to.
 * Accepts both `db` and a `$transaction` client, and is trivial to fake in tests.
 */
export interface StageHistoryWriter {
    opportunityStageHistory: {
        create: (args: {
            data: {
                opportunityId: string
                fromStatus: string | null
                toStatus: string
                changedByUserId: string | null
                outcome: string | null
                note: string | null
                changedAt?: Date
            }
        }) => Promise<unknown>
    }
}

export interface StageTransition {
    opportunityId: string
    /** null when the opportunity is being created (no prior stage). */
    fromStatus: string | null
    toStatus: OpportunityStatus
    /** null for system-driven transitions (cross-sell engine, cron jobs). */
    changedByUserId?: string | null
    outcome?: string | null
    /**
     * Snapshot of the deal note AT THIS TRANSITION. `Opportunity.notes` stays a
     * live, editable field, so without this snapshot the note that justified a
     * given stage change is overwritten by the next edit.
     */
    note?: string | null
    changedAt?: Date
}

/**
 * Append one transition to the log. Call inside the same transaction as the
 * `opportunity.update` so the log can never disagree with the row.
 *
 * A no-op when the stage did not actually change — re-saving a deal without
 * touching its stage should not manufacture funnel movement.
 */
export async function recordStageTransition(
    writer: StageHistoryWriter,
    transition: StageTransition
): Promise<boolean> {
    if (transition.fromStatus === transition.toStatus) return false

    const outcome =
        transition.outcome && isOpportunityOutcomeFor(
            transition.toStatus as "won" | "lost",
            transition.outcome
        )
            ? transition.outcome
            : null

    await writer.opportunityStageHistory.create({
        data: {
            opportunityId: transition.opportunityId,
            fromStatus: transition.fromStatus,
            toStatus: transition.toStatus,
            changedByUserId: transition.changedByUserId ?? null,
            outcome: isTerminalOpportunityStatus(transition.toStatus) ? outcome : null,
            note: transition.note?.trim() || null,
            ...(transition.changedAt ? { changedAt: transition.changedAt } : {}),
        },
    })

    return true
}

/**
 * The close date to report a deal under.
 *
 * Legacy rows closed before `outcomeAt` existed fall back to `updatedAt` — the
 * best available approximation, but note it is mutable, so pre-migration history
 * can still shift. New closes are stable.
 */
export function reportingCloseDate(opp: {
    outcomeAt?: Date | null
    updatedAt: Date
}): Date {
    return opp.outcomeAt ?? opp.updatedAt
}
