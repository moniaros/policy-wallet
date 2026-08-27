import type { DocumentKind } from "@/lib/services/ai/document-kind"

/**
 * Ordering and completeness for a policy's document chain.
 *
 * The chain is ordered by what the documents COVER, not by when someone
 * uploaded them — `uploadedAt` orders by administrative accident and is wrong
 * exactly when a customer back-fills an older renewal after a newer one.
 */

export interface ChainDocument {
    id: string
    documentKind: string | null
    effectiveFrom: Date | null
    effectiveTo: Date | null
    uploadedAt: Date
}

/** Kinds that carry contract terms. An invoice or a form carries none. */
const TERM_BEARING: readonly DocumentKind[] = ["policy_schedule", "renewal_notice", "certificate"]

export function isTermBearing(doc: ChainDocument): boolean {
    return TERM_BEARING.includes((doc.documentKind ?? "") as DocumentKind)
}

/**
 * Which document represents the POLICY — for analysis, and for every "open the
 * source document" link.
 *
 * Both call sites used to take the newest upload (`orderBy: uploadedAt desc`,
 * then `[0]`). That is right only while every document on a policy is a policy
 * schedule. Once a customer can attach a terms booklet (όροι) to an analysed
 * policy, the newest file is not the policy: the next analysis run spends
 * metered tokens reading the booklet and caches against it, and every
 * «Άνοιγμα εγγράφου» on the detail page points at a document that does not
 * contain the figure the customer clicked to check.
 *
 * The predicate is TERM-bearing, not POLICY-bearing. They differ on exactly one
 * kind and it is the one that matters here: `isPolicyBearing` excludes
 * `renewal_notice`, because it answers a different question — "is this evidence
 * of a policy at all", for the extraction-refusal gate. An ανανεωτήριο very
 * much carries the terms of the period it renews, so analysis must read it.
 *
 * A NULL kind counts, matching `isPolicyBearing`'s rule: rows predating the
 * field must behave exactly as they did before. So this changes behaviour only
 * for a document explicitly classified as carrying no terms.
 *
 * Falling back to the newest keeps a policy whose only file is a booklet
 * analysable and linkable, rather than failing MISSING_DOCUMENT or rendering
 * no source link at all.
 *
 * @param newestFirst documents ordered `uploadedAt` descending
 */
export function selectSourceDocument<T extends { documentKind?: string | null }>(
    newestFirst: readonly T[]
): T | undefined {
    return (
        newestFirst.find(
            (doc) => doc.documentKind == null || TERM_BEARING.includes(doc.documentKind as DocumentKind)
        ) ?? newestFirst[0]
    )
}

/** The base contract: the document that carries the full terms. */
export function originalDocument(docs: ChainDocument[]): ChainDocument | null {
    return docs.find((d) => d.documentKind === "policy_schedule") ?? null
}

/**
 * Oldest-effective first. Documents with no stated period fall back to
 * `uploadedAt`, and sort AFTER any dated document of the same instant — a
 * document that does not say what it covers cannot outrank one that does.
 */
export function orderChain(docs: ChainDocument[]): ChainDocument[] {
    return [...docs].sort((a, b) => {
        const aDated = a.effectiveFrom !== null
        const bDated = b.effectiveFrom !== null
        if (aDated !== bDated) return aDated ? -1 : 1
        const aKey = (a.effectiveFrom ?? a.uploadedAt).getTime()
        const bKey = (b.effectiveFrom ?? b.uploadedAt).getTime()
        return aKey - bKey
    })
}

/** The renewal in force latest — the one whose terms override. */
export function newestRenewal(docs: ChainDocument[]): ChainDocument | null {
    const renewals = orderChain(docs.filter((d) => d.documentKind === "renewal_notice"))
    return renewals.length ? renewals[renewals.length - 1] : null
}

export type ChainCompleteness =
    | { state: "complete"; originalId: string }
    /**
     * A renewal arrived with no original behind it. The product may still
     * proceed — refusing the upload would lose the only document the customer
     * has — but it must SAY so, because a renewal alone is a few changed lines
     * with no contract underneath, and any analysis of it is analysing a
     * fragment. Never presented as a complete policy.
     */
    | { state: "incomplete_terms"; reason: "renewal_without_original"; renewalId: string }
    | { state: "no_terms"; reason: "no_term_bearing_document" }

export function chainCompleteness(docs: ChainDocument[]): ChainCompleteness {
    const original = originalDocument(docs)
    if (original) return { state: "complete", originalId: original.id }

    const renewal = newestRenewal(docs)
    if (renewal) {
        return {
            state: "incomplete_terms",
            reason: "renewal_without_original",
            renewalId: renewal.id,
        }
    }
    return { state: "no_terms", reason: "no_term_bearing_document" }
}
