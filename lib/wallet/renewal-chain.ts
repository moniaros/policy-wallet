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
