import { db } from "@/lib/db"
import { normalizeInsurerKey } from "@/lib/wallet/insurer-registry"
import { isPlaceholderInsurerName } from "@/lib/wallet/policy-identity"
import { extractedField } from "@/lib/wallet/unreadable-value"

/**
 * The insurer's own call centre from the reference catalogue, as a FALLBACK
 * when a policy document states no number of its own (owner decision
 * 2026-09-24: verified call centre only; document first; shown on the benefit
 * card, the policy page and the offline card).
 *
 * Only a number whose catalogue confidence is `verified_2026` (checked against
 * the Bank of Greece register) is ever returned. Matching is conservative: the
 * policy's insurer name must contain every meaningful word of a catalogue
 * name, and when two different insurers match equally well nothing is
 * returned — a wrong company's phone is worse than no phone.
 */
export interface CatalogueInsurer {
    name: string
    nameEn: string | null
    legalNameEl: string | null
    callCenter: string | null
    fieldConfidence: unknown
}

export interface VerifiedCallCentre {
    insurer: string
    phone: string
}

/** Words that describe what a company is, not which one it is. */
const GENERIC = new Set(["ασφαλιστικη", "ασφαλιστικησ", "insurance", "asfalistiki", "hellas", "ελλαδοσ", "ελλαδασ", "greek", "branch", "υποκαταστημα", "company", "group"])

function keyTokens(raw: string | null | undefined): string[] {
    return normalizeInsurerKey(String(raw ?? "")).split(" ").filter((t) => t.length >= 3 && !GENERIC.has(t))
}

export function matchVerifiedCallCentre(rows: CatalogueInsurer[], insurerName: string | null | undefined): VerifiedCallCentre | null {
    if (!insurerName || isPlaceholderInsurerName(insurerName)) return null
    const policyTokens = new Set(keyTokens(insurerName))
    if (policyTokens.size === 0) return null

    let best: { row: CatalogueInsurer; score: number } | null = null
    let tie = false
    for (const row of rows) {
        const score = Math.max(
            ...[row.name, row.nameEn, row.legalNameEl].map((candidate) => {
                const tokens = keyTokens(candidate)
                return tokens.length > 0 && tokens.every((t) => policyTokens.has(t)) ? tokens.join(" ").length : 0
            })
        )
        if (score < 4) continue
        if (!best || score > best.score) { best = { row, score }; tie = false }
        else if (score === best.score && best.row.name !== row.name) tie = true
    }
    if (!best || tie) return null

    const confidence = (best.row.fieldConfidence ?? {}) as Record<string, unknown>
    if (confidence.callCenter !== "verified_2026") return null
    const phone = extractedField(best.row.callCenter).value
    return phone ? { insurer: best.row.name, phone } : null
}

/** Active catalogue rows, the columns the matcher reads. */
export async function loadCatalogueInsurers(): Promise<CatalogueInsurer[]> {
    return db.insurer
        .findMany({ where: { isActive: true }, select: { name: true, nameEn: true, legalNameEl: true, callCenter: true, fieldConfidence: true } })
        .catch(() => [])
}
