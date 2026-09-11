/**
 * The evidence a rule needs before its finding may be published as a GAP.
 * PW-PROVENANCE-01 W2-02 (plan Wave 2).
 *
 * W2-01 records, beside every gap row, what the document was evidence of for
 * each field the rule read. This module decides what that record ALLOWS:
 *
 *   gap           the document's evidence meets the definition's floor —
 *                 counted, summarised, sent, rendered as a finding
 *   review        the rule fired on a value the document did not confirm
 *                 (asserted by the model, its citation refuted or unchecked) —
 *                 disclosed and labelled, counted in no summary, sent nowhere:
 *                 the treatment `under_review` provenance already gets (B3)
 *   not_recorded  the rule needed a value and the extraction had none —
 *                 disclosed with the «not recorded» wording, never «not covered»
 *
 * The floor is a property of the DEFINITION. It is derived from what the
 * rule asks: a rule that fires on an explicit `false`, a limit or a drift
 * claims something the document SAYS, so it needs `policy_verified`; a
 * `missing` / `all_missing` rule fires ON silence by design and its wording
 * already says «not recorded», so its floor is `policy_silent`. A definition
 * may declare `evidenceFloor` to override the derivation; the guard
 * (`tests/unit/evidence-floor-declared.test.ts`) prints every resolved floor.
 *
 * Rows written before W2-01 carry no `_evidence`. They are treated as
 * `policy_asserted` — nothing checked them — and so demote to review. The
 * alternative, grandfathering them, was rejected at the series' open
 * (HANDOFF P-H3): a finding is not more true for being older.
 */

import { AUTHORED_GAP_DEFINITIONS, type AuthoredGapDefinition } from "./authored-catalogue"
import { DOCUMENT_EVIDENCE_STATES, type DocumentEvidence } from "./document-evidence"

export type EvidenceVerdict = "gap" | "review" | "not_recorded"

const RANK: Record<DocumentEvidence, number> = { policy_silent: 0, policy_asserted: 1, policy_verified: 2 }

const SILENCE_OPERATORS = new Set(["missing", "all_missing"])

/** The floor a definition's logic implies: silence-rules ask for nothing, every other rule asks the document. */
export function defaultEvidenceFloor(detectionLogic: unknown): DocumentEvidence {
    const l = detectionLogic as { rules?: unknown } | null
    const rules: unknown[] = Array.isArray(l?.rules) ? (l!.rules as unknown[]) : [detectionLogic]
    const operators = rules
        .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
        .map((r) => (typeof r.operator === "string" ? r.operator : typeof r.type === "string" ? r.type : ""))
        .filter(Boolean)
    if (operators.length === 0) return "policy_verified"
    return operators.every((op) => SILENCE_OPERATORS.has(op)) ? "policy_silent" : "policy_verified"
}

/** The floor a definition declares, or the one its logic implies. */
export function evidenceFloorFor(def: Pick<AuthoredGapDefinition, "detectionLogic"> & { evidenceFloor?: DocumentEvidence }): DocumentEvidence {
    if (def.evidenceFloor && (DOCUMENT_EVIDENCE_STATES as readonly string[]).includes(def.evidenceFloor)) return def.evidenceFloor
    return defaultEvidenceFloor(def.detectionLogic)
}

/** Every active definition's floor, by slug — the catalogue is the source, never a row. */
export const EVIDENCE_FLOOR_BY_SLUG: Readonly<Record<string, DocumentEvidence>> = Object.freeze(
    Object.fromEntries(AUTHORED_GAP_DEFINITIONS.filter((d) => d.isActive).map((d) => [d.slug, evidenceFloorFor(d)]))
)

/** A slug the catalogue does not know gets the strictest floor — the conservative side. */
export function evidenceFloorForSlug(slug: string | null | undefined): DocumentEvidence {
    if (!slug) return "policy_verified"
    const snake = slug.trim().toLowerCase().replace(/-+/g, "_")
    return EVIDENCE_FLOOR_BY_SLUG[slug] ?? EVIDENCE_FLOOR_BY_SLUG[snake] ?? "policy_verified"
}

/** The weakest evidence a stored row records, or `policy_asserted` when nothing recorded any (P-H3: no grandfathering). */
export function lowestEvidenceOf(ruleInputs: unknown): DocumentEvidence {
    const lowest = (ruleInputs as { _evidence?: { lowest?: unknown } } | null | undefined)?._evidence?.lowest
    return typeof lowest === "string" && (DOCUMENT_EVIDENCE_STATES as readonly string[]).includes(lowest)
        ? (lowest as DocumentEvidence)
        : "policy_asserted"
}

/** What a stored finding may claim, from its definition's floor and the evidence its row records. */
export function evidenceVerdictFor(slug: string | null | undefined, ruleInputs: unknown): EvidenceVerdict {
    const floor = evidenceFloorForSlug(slug)
    const lowest = lowestEvidenceOf(ruleInputs)
    if (RANK[lowest] >= RANK[floor]) return "gap"
    return lowest === "policy_silent" ? "not_recorded" : "review"
}

/** Only a `gap` verdict is counted, summarised or sent. */
export function isPublishableVerdict(verdict: EvidenceVerdict): boolean {
    return verdict === "gap"
}
