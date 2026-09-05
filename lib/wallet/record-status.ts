import type { PolicyStatus } from "@/lib/policy-status"

/**
 * B1 — the record status (PW-TRANSPARENCY-02).
 *
 * Five states that describe where the WORK on a policy record has got to,
 * never how protected the person is:
 *
 *   under_examination     ΥΠΟ ΕΞΕΤΑΣΗ         uploaded; analysis not complete
 *   needs_data            ΧΡΕΙΑΖΕΤΑΙ ΣΤΟΙΧΕΙΑ analysis could not complete; what is needed is named
 *   awaiting_confirmation ΠΡΟΣ ΕΠΙΒΕΒΑΙΩΣΗ    analysis complete; no person has confirmed it
 *   confirmed             ΕΠΙΒΕΒΑΙΩΜΕΝΟ       a person reviewed and confirmed (C1 — unreachable today)
 *   inactive              ΑΝΕΝΕΡΓΟ            expired or cancelled
 *
 * No status derives from the number of findings: zero findings is a result,
 * not a state, and it only means something once a person has confirmed the
 * record. `confirmed` requires `confirmedAt`, which nothing sets until the
 * review checklist (C1) exists; every caller passes null and the guard
 * tests/unit/record-status.test.ts fails if one stops doing so.
 */
export type RecordStatus = "under_examination" | "needs_data" | "awaiting_confirmation" | "confirmed" | "inactive"

export type RecordNeed = "consent" | "plan" | "tokens" | "document" | "permission" | "fields" | "technical"

export interface RecordStatusInput {
    /** From resolvePolicyLifecycle — the one lifecycle call (status, expiry, countdown). */
    lifecycleStatus: PolicyStatus | null | undefined
    /** The policy row's own `status` column, for cancelled / deleted rows the lifecycle does not see. */
    policyStatus?: string | null
    latestRun: { status: string; blockedReason?: string | null; failureCode?: string | null } | null
    /** Extraction paths the rules could not read (B2 `input_absent`), when the caller has them. */
    missingFields?: readonly string[]
    /** The per-row confirmation roll-up. C1 will set it; until then it is always null. */
    confirmedAt: Date | string | null
}

export interface RecordStatusResult {
    status: RecordStatus
    need: RecordNeed | null
    missingFields: string[]
}

function needFromBlockedReason(reason: string | null | undefined): RecordNeed {
    switch (reason) {
        case "ai_consent_missing":
            return "consent"
        case "free_tier_ai_locked":
            return "plan"
        case "insufficient_tokens":
            return "tokens"
        case "missing_document":
            return "document"
        case "forbidden":
        case "policy_deleted":
            return "permission"
        default:
            return "technical"
    }
}

const NONE: string[] = []

export function resolveRecordStatus(input: RecordStatusInput): RecordStatusResult {
    const policyStatus = (input.policyStatus ?? "").toLowerCase()
    const lifecycle = input.lifecycleStatus ?? null

    if (lifecycle === "expired" || lifecycle === "cancelled" || policyStatus === "cancelled" || policyStatus === "expired" || policyStatus === "deleted") {
        return { status: "inactive", need: null, missingFields: NONE }
    }
    if (input.confirmedAt) {
        return { status: "confirmed", need: null, missingFields: NONE }
    }
    // The upload produced a policy with no readable details (EXTRACTION_EMPTY):
    // the document itself is what is needed, whatever the run says.
    if (lifecycle === "action_needed") {
        return { status: "needs_data", need: "document", missingFields: NONE }
    }

    const run = input.latestRun
    if (!run) return { status: "under_examination", need: null, missingFields: NONE }

    switch (run.status) {
        case "blocked":
            return { status: "needs_data", need: needFromBlockedReason(run.blockedReason), missingFields: NONE }
        case "failed":
            return run.failureCode === "EXTRACTION_EMPTY"
                ? { status: "needs_data", need: "document", missingFields: NONE }
                : { status: "under_examination", need: "technical", missingFields: NONE }
        case "completed":
        case "completed_with_warnings": {
            const missing = [...(input.missingFields ?? [])]
            return { status: "awaiting_confirmation", need: missing.length > 0 ? "fields" : null, missingFields: missing }
        }
        default:
            // queued, running, pending — the work is in progress.
            return { status: "under_examination", need: null, missingFields: NONE }
    }
}

export const RECORD_STATUSES: readonly RecordStatus[] = ["under_examination", "needs_data", "awaiting_confirmation", "confirmed", "inactive"]
