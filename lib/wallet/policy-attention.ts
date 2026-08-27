/**
 * "What needs attention?" and "What do I do next?" — the two questions the
 * policy page's head has to answer, decided in one place.
 *
 * The page could already answer neither. It rendered every state at once —
 * an expired banner, a renewal outlook, a failed-run banner, a gap count, an
 * unverified-extraction note, three quote CTAs — and left the reader to work
 * out which mattered. Twenty sections deep, that is not a question a customer
 * standing in a garage can answer.
 *
 * Both functions are PURE and total: every input maps to exactly one outcome,
 * including the case nothing needs attention, which is stated rather than left
 * as an empty space (absence of a warning is not the same as an all-clear, and
 * only one of those is trustworthy).
 *
 * They decide nothing about coverage. Detection and severity remain the
 * deterministic engine's (`lib/gap-detection.ts`); this module only ranks
 * states the page already knows about, and it deliberately never reads a gap's
 * SEVERITY — those values are unvalidated pending underwriter review, so
 * ordering by them here would smuggle a judgement into the one line the reader
 * is most likely to act on.
 */

export type AttentionKind =
    | "analysis_failed"
    | "renewal_mismatch"
    | "renewal_under_review"
    | "expired"
    | "expiring"
    | "items_to_review"
    | "unverified"
    | "clear"

export interface AttentionInput {
    /** Athens-calendar days to expiry from resolvePolicyLifecycle; null = unknown. */
    daysLeft: number | null
    /** The latest analysis run failed (acordData.processingError / run status). */
    analysisFailed: boolean
    /** Count of open findings — a COUNT only; severity is never consulted here. */
    reviewItemCount: number
    /** Extraction is unconfirmed or flagged. */
    unverified: boolean
    /** No trustworthy end date exists at all. */
    unknownDuration?: boolean
    /**
     * A renewal document is in hand and the run that will read it has not
     * finished. The stored dates therefore describe the period the customer has
     * just replaced, and no verdict drawn from them is established yet.
     */
    renewalUnderReview?: boolean
    /**
     * The renewal that was read named a DIFFERENT policy. Carries both numbers
     * so the reader can compare them against the paper in front of them.
     */
    renewalMismatch?: { expected: string; found: string } | null
}

export interface Attention {
    kind: AttentionKind
    /** Which section the one action opens. null for `clear`. */
    target: string | null
    /** Substituted into the copy key by the caller (count / days). */
    count?: number
    /** Named placeholders substituted into the copy, for states with more than a count. */
    values?: Record<string, string>
}

/**
 * The single most important thing about this policy right now.
 *
 * Ordered by what costs the reader most if missed, NOT by how loud the current
 * UI is about it:
 *
 *  1. `analysis_failed` — everything else on the page may be stale, so it is
 *     the precondition for trusting any other line.
 *  1a. `renewal_mismatch` — a renewal was read and refused; nothing moves until
 *     the reader resolves it.
 *  1b. `renewal_under_review` — a renewal is in hand but unread, so both date
 *     verdicts below describe a period that may already have been replaced.
 *  2. `expired` — there is no cover at all; nothing else competes.
 *  3. `expiring` — a deadline the reader can still act on.
 *  4. `items_to_review` — findings, framed as items rather than verdicts.
 *  5. `unverified` — the data was read by a machine and not checked.
 *  6. `clear` — said out loud.
 *
 * `unknown_duration` deliberately does NOT outrank findings: a missing expiry
 * date is a data problem the review screen already chases, while a finding is
 * about the cover itself.
 */
export function resolveAttention(input: AttentionInput): Attention {
    if (input.analysisFailed) return { kind: "analysis_failed", target: "review" }
    // A renewal was read and REFUSED. This is a dead end the reader has to
    // resolve — nothing else on the page changes until they do — and it outranks
    // the in-progress state because the check has already finished.
    if (input.renewalMismatch) {
        return {
            kind: "renewal_mismatch",
            target: "documents",
            values: { expected: input.renewalMismatch.expected, found: input.renewalMismatch.found },
        }
    }
    // Outranks BOTH date verdicts, and deliberately claims neither of them.
    // The customer uploaded an ανανεωτήριο; until the run reads it, "expired"
    // is a statement about a period they have just replaced, and "active" is a
    // statement nothing has established. Saying so is the honest third option —
    // the same rule as the protection score and the monitoring card: a check
    // that has not run does not get to report an outcome.
    if (input.renewalUnderReview) return { kind: "renewal_under_review", target: "documents" }
    if (input.daysLeft !== null && input.daysLeft < 0) return { kind: "expired", target: "dates" }
    if (input.daysLeft !== null && input.daysLeft <= 30) {
        return { kind: "expiring", target: "dates", count: input.daysLeft }
    }
    if (input.reviewItemCount > 0) {
        return { kind: "items_to_review", target: "review", count: input.reviewItemCount }
    }
    if (input.unverified) return { kind: "unverified", target: "documents" }
    return { kind: "clear", target: null }
}

export type PrimaryActionKind = "renew" | "review" | "retry_analysis" | "download" | "share"

export interface PrimaryAction {
    kind: PrimaryActionKind
    /** Anchor/section the action leads to, when it is navigational. */
    target: string | null
}

/**
 * The ONE action the head offers, contextual to state.
 *
 * Deliberately not "the action for the attention item" in every case: an
 * expired policy's attention line explains the lapse, but the useful action is
 * still getting a renewal quote. A failed analysis is the exception — retrying
 * it is both the explanation and the fix.
 *
 * `download` is the fallback rather than `share`, because the document is the
 * thing a customer is asked for at a garage or a hospital desk; sharing is
 * offered from the documents section, where the rest of the sharing controls
 * already live.
 */
export function resolvePrimaryAction(input: {
    attention: Attention
    hasDocument: boolean
}): PrimaryAction {
    switch (input.attention.kind) {
        case "analysis_failed":
            return { kind: "retry_analysis", target: "review" }
        case "expired":
        case "expiring":
            return { kind: "renew", target: "dates" }
        case "items_to_review":
            return { kind: "review", target: "review" }
        case "unverified":
        case "clear":
        default:
            return input.hasDocument ? { kind: "download", target: null } : { kind: "share", target: null }
    }
}
