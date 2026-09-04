/**
 * The one reading of «this document was read, and it is not a policy».
 *
 * A one-line PDF with no policy details went through the onboarding upload in
 * Sept 2026 and came out as an `active` policy: the providers substitute a
 * placeholder identity for an empty extraction, `buildMetadata` keeps the
 * stored placeholders when the evidence gate rejects the document, and the
 * basic-summary path wrote `status: "active"` over the result without asking
 * whether anything had actually been read. Three surfaces then lied from the
 * one row — the onboarding said «Το διαβάσαμε», the wallet said «δεν έχει
 * αναλυθεί», and the coverage map painted the line «Καλυμμένο».
 *
 * Two predicates, both routed through lib/wallet/policy-identity.ts so no
 * file here learns a sentinel literal:
 *
 *   - {@link isEmptyExtraction} is asked at the WRITE side, on the identity as
 *     it would be stored after the extraction plus the raw extraction: no
 *     usable identity, no period the document itself states, no coverages.
 *     A true answer means the policy must not become `active` — it is stamped
 *     `action_needed` with a retryable {@link EXTRACTION_EMPTY_CODE} error and
 *     KEPT (keep-and-inform: it may be the wrong file, or a scan the person
 *     can replace). Nothing is discarded here; policy-discard is for technical
 *     failures, and this is a readable document that is simply not a policy.
 *
 *   - {@link isUnreadPolicy} is asked at the READ side by every surface that
 *     would otherwise count the row as cover: a placeholder identity, or the
 *     empty-extraction stamp, is the presence of a DOCUMENT and never of a
 *     policy. Such a row renders «Δεν έχει διαβαστεί», never «Καλυμμένο», and
 *     is not held in the coverage model.
 *
 * Deliberately narrow on the read side: a policy with a REAL identity whose
 * later deep run was token-blocked or timed out is still a policy in force —
 * the identity established presence, and a blocked re-read does not unmake
 * it. Only the two shapes above are unread.
 */

import { coverageInputsFrom } from "@/lib/protection/coverage-model"
import { hasPlaceholderIdentity } from "@/lib/wallet/policy-identity"

/** The processingError code a read-but-empty document is stamped with. */
export const EXTRACTION_EMPTY_CODE = "EXTRACTION_EMPTY" as const

export interface EmptyExtractionInput {
    /** The insurer as it would be STORED after this extraction (metadata), not the raw model output. */
    insurerName: string | null | undefined
    /** The policy number as it would be STORED after this extraction. */
    policyNumber: string | null | undefined
    /** The raw extraction: the period and the coverages the DOCUMENT states. */
    extraction: {
        startDate?: string | null
        endDate?: string | null
        acordData?: unknown
    }
}

function text(value: string | null | undefined): string {
    return String(value ?? "").trim()
}

/**
 * True when the extraction established nothing a policy is made of: both
 * halves of the identity are placeholders or blank, the document states no
 * period, and it lists no coverages. Any ONE of those is enough to proceed —
 * real schedules do omit fields — so this fires only on a document that gave
 * the pipeline nothing at all.
 */
export function isEmptyExtraction(input: EmptyExtractionInput): boolean {
    if (!hasPlaceholderIdentity(input)) return false
    if (text(input.extraction.startDate) || text(input.extraction.endDate)) return false
    if (coverageInputsFrom(input.extraction.acordData).length > 0) return false
    return true
}

export interface ExtractionEmptyProcessingError {
    code: typeof EXTRACTION_EMPTY_CODE
    message: string
    retryable: true
    occurredAt: string
}

/**
 * The stamp, in the shape every other keep-and-inform write uses
 * (`markAnalysisIncomplete`, the token gate): code, message, retryable,
 * occurredAt. The message is internal — the UI localises the CODE.
 */
export function extractionEmptyProcessingError(now: Date = new Date()): ExtractionEmptyProcessingError {
    return {
        code: EXTRACTION_EMPTY_CODE,
        message: "The document was read but carries no policy identity, period of cover or coverages",
        retryable: true,
        occurredAt: now.toISOString(),
    }
}

export interface UnreadPolicySource {
    insurerName?: string | null
    policyNumber?: string | null
    acordData?: unknown
}

/** The stored processingError code, or null. */
export function processingErrorCode(acordData: unknown): string | null {
    const code = (acordData as { processingError?: { code?: unknown } } | null | undefined)?.processingError?.code
    return typeof code === "string" && code.length > 0 ? code : null
}

/**
 * Is this row the presence of a document rather than of a policy? True for a
 * placeholder identity (nothing about it came from a human or a successful
 * read) and for the empty-extraction stamp. Never true merely because a
 * processingError exists — see the module note.
 */
export function isUnreadPolicy(policy: UnreadPolicySource): boolean {
    if (hasPlaceholderIdentity(policy)) return true
    return processingErrorCode(policy.acordData) === EXTRACTION_EMPTY_CODE
}
