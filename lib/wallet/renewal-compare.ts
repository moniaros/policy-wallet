import { buildRenewalDifferential, type RenewalDifferential } from "@/lib/services/renewal-differential"

export interface ChainDocument {
    id: string
    uploadedAt: Date
    effectiveFrom: Date | null
    extractionCache: unknown
}

/**
 * Spec v2 §10.3 «compare with previous»: the two most recent documents of the
 * policy's chain that each carry an extraction, ordered by the period they
 * COVER (effectiveFrom) and only then by upload time — a back-filled old
 * renewal must not read as the newest. Null when fewer than two documents
 * were read, so the surface says "nothing to compare" instead of inventing.
 */
export function differentialFromDocuments(docs: ChainDocument[]): RenewalDifferential | null {
    const read = docs
        .map((d) => ({ d, acord: (d.extractionCache as { extraction?: { acordData?: unknown } } | null)?.extraction?.acordData }))
        .filter((x) => x.acord && typeof x.acord === "object")
        .sort((a, b) => (a.d.effectiveFrom ?? a.d.uploadedAt).getTime() - (b.d.effectiveFrom ?? b.d.uploadedAt).getTime())
    if (read.length < 2) return null
    const before = read[read.length - 2]
    const after = read[read.length - 1]
    return buildRenewalDifferential({ fromDocumentId: before.d.id, toDocumentId: after.d.id, before: before.acord, after: after.acord })
}
