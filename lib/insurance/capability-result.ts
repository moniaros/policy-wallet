/**
 * The shared result contract for the PW-GROWTH-02 capabilities.
 *
 * Five capabilities answer questions about a policy the reader is holding:
 * does it overlap another, does it contain an average clause, what does it say
 * about a condition, on what basis is a vehicle valued, does it meet a
 * requirement. They share one shape, defined once here and imported — never
 * copied (§0.2 of the run contract).
 *
 * WHY `cannot_determine` IS A FIRST-CLASS OUTCOME AND NOT AN ERROR. The
 * standing invariant on this product is that the absence of a detected problem
 * is never evidence of no problem, and must never render as reassurance. It has
 * produced defects on three surfaces already. A capability that could not run —
 * because the field was never extracted, because the document yielded a
 * placeholder, because it needs two policies and has one — must say so in a way
 * the UI cannot accidentally render as "all clear". Collapsing that into a
 * falsy return is how the third of those defects happened.
 *
 * NONE OF THIS TOUCHES `lib/gap-detection.ts`. That is deliberate design, not an
 * accident of scope: rules decide gaps and severity, and a capability here is a
 * query over already-extracted data. No result may carry `isDetected` or
 * `severity`, and nothing here may be routed into a gap.
 */

/** Why a capability could not answer. Each maps to distinct user-facing copy. */
export type UndeterminableReason =
    /** The document did not yield the field at all. */
    | 'field_not_extracted'
    /** A sentinel or placeholder is present — the extractor could not read it. */
    | 'field_unreadable'
    /** The question needs two documents and only one is available. */
    | 'insufficient_documents'
    /** An external reference is missing or past its reverify date. */
    | 'no_source_for_reference'
    /** The policy's line of business is not one this capability covers. */
    | 'out_of_scope'
    /**
     * The value is present but carries no citation, so the capability cannot
     * show the reader where it came from. Distinct from `field_not_extracted`:
     * the fact exists, the evidence does not. See the note on DocumentAnchor.
     */
    | 'no_evidence_anchor'

/**
 * Where a claimed fact came from — a citation into the source document.
 *
 * THE SNIPPET IS REQUIRED AND THE PAGE IS NOT. `page` is what the extractor
 * managed to identify and is frequently absent; the verbatim quote is what lets
 * a reader find the sentence in their own PDF, and without it there is nothing
 * to check. A capability that cannot produce a snippet must return
 * `cannot_determine` with `no_evidence_anchor` rather than assert a stance —
 * an unevidenced stance is an assertion about someone's cover.
 *
 * This is deliberately NOT a looser "pointer into extracted text". That form was
 * proposed and rejected: it would have let a capability quote our own extraction
 * back to the reader as though it were the document.
 */
export interface DocumentAnchor {
    /** 1-based page in the source document, when the extractor identified one. */
    page?: number
    /** Short verbatim quote from the document. Required — see above. */
    snippet: string
    /**
     * The extraction key this cites, e.g. `policyNumber` or `conditions[3]`.
     * Matches the key convention in `lib/services/ai/extraction-citations.ts`.
     */
    fieldKey: string
    policyId: string
}

/** Where a single input to a computation came from. Rendered beside the output. */
export type InputProvenance =
    | { from: 'document'; field: string; policyId: string; anchor?: DocumentAnchor }
    | { from: 'user'; field: string }
    | { from: 'source'; sourceId: string; verifiedAt: string }

export type CapabilityResult<T> =
    | {
          status: 'determined'
          value: T
          /**
           * Every input that produced `value`, so the UI can show its working.
           * A number without its inputs is an assertion; with them it is a
           * calculation the reader can check.
           */
          inputs: Record<string, InputProvenance>
          /** Stated assumptions, rendered to the reader, never silent. */
          assumptions: string[]
      }
    | {
          status: 'cannot_determine'
          reason: UndeterminableReason
          /** The extraction keys that would have been needed. */
          missing: string[]
      }

/** Narrowing helper, so call sites do not re-derive the discriminant. */
export function isDetermined<T>(
    r: CapabilityResult<T>
): r is Extract<CapabilityResult<T>, { status: 'determined' }> {
    return r.status === 'determined'
}

/** Construct an undeterminable result. Keeps the shape honest at every site. */
export function cannotDetermine<T>(
    reason: UndeterminableReason,
    missing: string[] = []
): CapabilityResult<T> {
    return { status: 'cannot_determine', reason, missing }
}

/** Construct a determined result. `assumptions` is required, not optional. */
export function determined<T>(
    value: T,
    inputs: Record<string, InputProvenance>,
    assumptions: string[]
): CapabilityResult<T> {
    return { status: 'determined', value, inputs, assumptions }
}
