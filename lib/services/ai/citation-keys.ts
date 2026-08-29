/**
 * The key convention for citing an ARRAY MEMBER of an extraction.
 *
 * WHY THIS IS A SEPARATE MODULE FROM `extraction-citations.ts`.
 *
 * Two things were written together and have very different risk. The key
 * convention below is pure data and pure functions: it names how a citation for
 * "the third condition" is spelled, and nothing consumes it on the extraction
 * path. Widening the PROMPT the model receives and the SANITIZER that decides
 * what the pipeline stores is a change to the extraction contract on the money
 * path, with EXTRACTION_CITATIONS=1 live in production.
 *
 * The second was held back (branch `feat/growth-extraction-citations`) because
 * the only evidence that it is safe comes from the mock provider — and the mock
 * provider is how the July 2026 Gemini schema-budget incident stayed invisible
 * to CI and E2E while extraction was dead in production. "Low risk" is not
 * something this setup can establish either way, so it is not claimed.
 *
 * This module carries no such exposure and ships, so the capabilities that read
 * anchors can compile and be reviewed. Until the held branch lands, the
 * sanitizer still drops member citations, so `getAnchor` finds none in
 * production and any capability requiring evidence returns `cannot_determine`
 * with `no_evidence_anchor`. That is the documented, honest state — not a
 * degradation introduced by the split.
 */

/** Arrays whose members may be cited individually, keyed `name[index]`. */
export const CITABLE_ARRAYS = ['conditions', 'coverages', 'exclusions'] as const
export type CitableArray = (typeof CITABLE_ARRAYS)[number]

/** Build the key for an array member, so producers and readers agree. */
export function arrayCitationKey(array: CitableArray, index: number): string {
    return `${array}[${index}]`
}

/** `conditions[3]` → { array: 'conditions', index: 3 }. Null for anything else. */
export function parseArrayCitationKey(
    key: string
): { array: CitableArray; index: number } | null {
    const m = /^([a-z]+)\[(\d{1,3})\]$/.exec(key)
    if (!m) return null
    const array = m[1] as CitableArray
    if (!(CITABLE_ARRAYS as readonly string[]).includes(array)) return null
    const index = Number(m[2])
    // A three-digit cap is generous for a policy schedule and stops a malformed
    // key from allocating an arbitrary object graph.
    if (!Number.isInteger(index) || index < 0 || index > 500) return null
    return { array, index }
}
