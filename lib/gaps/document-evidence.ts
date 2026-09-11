/**
 * What the document is evidence OF, per field — three states a rule can see.
 * PW-PROVENANCE-01 W2-01 (plan Wave 2).
 *
 * The extractor is silent about most fields, and a model can assert a value it
 * did not read. Until now a rule saw only a value or its absence; «unknown is
 * not absence» was a rule about wording. These states make it structural:
 *
 *   policy_verified  the field has a value, its citation was found in the
 *                    document's own text (W1-02 `verified: true`)
 *   policy_asserted  the field has a value, but no citation, or one the pages
 *                    did not contain, or one we could not check
 *   policy_silent    the extraction has no value at this path
 *
 * Deliberately NOT added to the protection ladder (`lib/protection/evidence.ts`)
 * here: that ladder ranks a person's statements against a policy's, and where
 * an asserted read sits on it is W3-01's question (needs against cover). These
 * are the document side's own states, dependency-free.
 *
 * Computed at the ONE writer of gap rows (`lib/gaps/gap-instance-writer.ts`),
 * not in `lib/gap-detection.ts`: that file is owner-frozen (DECISIONS D-V1,
 * pinned by hash) and detection is untouched by this — evidence is a record
 * of how sure a finding was allowed to be, written beside it.
 */

import { fieldsReadByDetectionLogic } from "./rule-read-fields"

export type DocumentEvidence = "policy_verified" | "policy_asserted" | "policy_silent"

export const DOCUMENT_EVIDENCE_STATES: readonly DocumentEvidence[] = ["policy_verified", "policy_asserted", "policy_silent"]

/** Weakest → strongest, for `lowestDocumentEvidence`. */
const RANK: Record<DocumentEvidence, number> = { policy_silent: 0, policy_asserted: 1, policy_verified: 2 }

/** The same reading of «nothing recorded here» as the engine's `isAbsent`: an empty array counts. */
export function isSilent(value: unknown): boolean {
    if (value === undefined || value === null || value === "") return true
    return Array.isArray(value) && value.length === 0
}

function valueAt(acordData: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((o, key) => (o && typeof o === "object" ? (o as Record<string, unknown>)[key] : undefined), acordData)
}

/** The citation key the extraction stores for an `acordData` path (W1-01). */
export const citationKeyFor = (path: string): string => `acordData.${path}`

/** The document's evidence for one field, read from the stored row shape (W0-04). */
export function documentEvidenceFor(acordData: unknown, path: string): DocumentEvidence {
    if (isSilent(valueAt(acordData, path))) return "policy_silent"
    const sources = (acordData as { extraction?: { sources?: Record<string, { verified?: boolean }> } } | null)?.extraction?.sources
    return sources?.[citationKeyFor(path)]?.verified === true ? "policy_verified" : "policy_asserted"
}

/** One state per path, in the order given. */
export function documentEvidenceForFields(acordData: unknown, paths: readonly string[]): Record<string, DocumentEvidence> {
    const out: Record<string, DocumentEvidence> = {}
    for (const path of paths) out[path] = documentEvidenceFor(acordData, path)
    return out
}

/** The document's evidence for every field a definition's logic reads, and the weakest of them. */
export function documentEvidenceForLogic(
    detectionLogic: unknown,
    acordData: unknown
): { evidence: Record<string, DocumentEvidence>; lowest: DocumentEvidence } {
    const evidence = documentEvidenceForFields(acordData, fieldsReadByDetectionLogic(detectionLogic))
    return { evidence, lowest: lowestDocumentEvidence(Object.values(evidence)) }
}

/** The weakest link decides what a finding built on several fields may claim. */
export function lowestDocumentEvidence(states: readonly DocumentEvidence[]): DocumentEvidence {
    let lowest: DocumentEvidence = "policy_verified"
    let seen = false
    for (const s of states) {
        seen = true
        if (RANK[s] < RANK[lowest]) lowest = s
    }
    return seen ? lowest : "policy_silent"
}
