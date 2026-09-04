/**
 * The document gate's vocabulary.
 *
 * A user's selected branch is a HINT about a document. Until Sept 2026 it was
 * the only thing the pipeline knew before committing a Policy row and sending
 * the whole file to a model; this module names what the gate establishes for
 * itself instead, and every surface reads that instead of the hint.
 */

import type { BatchFailureCode } from "@/lib/wallet/batch-upload-errors"
import type { WriteBranchId } from "@/lib/insurance/taxonomy"

/** What the gate concluded the document IS. Only the policy-bearing kinds may become a policy. */
export const DOCUMENT_TYPES = [
    /** A schedule naming insurer, insured, number, period and cover. */
    "insurance_policy",
    /** Proof of cover without the full schedule (green card, βεβαίωση). */
    "insurance_certificate",
    /** A change to an existing contract (πρόσθετη πράξη). */
    "insurance_endorsement",
    /** A renewal notice or invitation for an existing contract. */
    "insurance_renewal",
    /** A quotation / proposal: prices cover that does not yet exist. */
    "insurance_quotation",
    /** A claim form or claim correspondence. */
    "insurance_claim",
    /** Γενικοί/Ειδικοί Όροι, a guide, a checklist — insurance words, no contract. */
    "insurance_terms_or_guide",
    /** A premium invoice or payment receipt. */
    "invoice_payment",
    /** Insurance domain, kind unclear. */
    "insurance_other",
    /** Not about insurance at all. */
    "non_insurance",
    /** Nothing could be read. */
    "unknown_unreadable",
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/**
 * The kinds that may become or amend a Policy row. Matches
 * lib/services/ai/document-kind.ts POLICY_BEARING_KINDS (schedule + certificate)
 * plus the two kinds the renewal path has always attached to an existing policy.
 */
export const POLICY_BEARING_TYPES: ReadonlySet<DocumentType> = new Set<DocumentType>([
    "insurance_policy",
    "insurance_certificate",
    "insurance_endorsement",
    "insurance_renewal",
])

/**
 * The kinds an ATTACHMENT to an existing policy may be: anything from the
 * insurance domain. A customer adds the terms booklet or the premium receipt
 * to a policy they hold; a restaurant menu is refused in either mode.
 */
export const ATTACHABLE_TYPES: ReadonlySet<DocumentType> = new Set<DocumentType>([
    ...POLICY_BEARING_TYPES,
    "insurance_quotation",
    "insurance_claim",
    "insurance_terms_or_guide",
    "invoice_payment",
    "insurance_other",
])

/**
 * Branch FAMILIES. The write vocabulary (lib/insurance/taxonomy.ts
 * WRITE_BRANCH_IDS) distinguishes motor from motorbike and boat hull from
 * boat TPL; a schedule's first pages often do not, and the extraction model
 * settles the exact line later. The gate reasons in families so a motorbike
 * policy declared as «Αυτοκίνητο» is consistent, and only a HEALTH document
 * declared as MOTOR is a mismatch.
 */
export const BRANCH_FAMILIES = ["motor", "home", "health", "life", "marine", "business", "travel", "pet"] as const
export type BranchFamily = (typeof BRANCH_FAMILIES)[number]

/**
 * Family membership, as tuples. NOT a line→area table (lib/protection/domains.ts
 * is the one of those, and tests/unit/protection-domains-single-source.test.ts
 * enumerates for a second): a family is what a schedule's first pages let the
 * gate tell apart, an area is where a risk lives in someone's life. `other`
 * belongs to no family.
 */
const FAMILY_MEMBERS: ReadonlyArray<readonly [BranchFamily, readonly WriteBranchId[]]> = [
    ["motor", ["motor", "motorbike", "roadside"]],
    ["home", ["home", "fine_art"]],
    ["health", ["health", "group_health"]],
    ["life", ["life", "group_life", "pension", "group_pension", "income_protection", "personal_accident"]],
    ["marine", ["boat", "boat_hull", "boat_tpl", "marine_hull", "marine_cargo", "marine_crew", "transports"]],
    ["business", ["business", "liability", "professional_liability", "employer_liability", "cyber", "money", "fidelity", "legal_expenses"]],
    ["travel", ["travel"]],
    ["pet", ["pet"]],
]

const FAMILY_OF: ReadonlyMap<string, BranchFamily> = new Map(
    FAMILY_MEMBERS.flatMap(([family, members]) => members.map((member) => [member, family] as const))
)

/** The family a declared write-branch belongs to; null for `other` or an unknown id. */
export function branchFamilyOf(branch: string | null | undefined): BranchFamily | null {
    if (!branch) return null
    return FAMILY_OF.get(branch) ?? null
}

/** The canonical write-branch id to suggest when the gate detected a family: the family's first member. */
export const FAMILY_DEFAULT_BRANCH: Record<BranchFamily, WriteBranchId> = Object.fromEntries(
    FAMILY_MEMBERS.map(([family, members]) => [family, members[0]])
) as Record<BranchFamily, WriteBranchId>

export type ValidationStatus = "validated" | "requires_review" | "rejected"

export type BranchConsistency =
    /** Declared and detected agree (same family), or detected only refines an `other`. */
    | "consistent"
    /** Declared and detected are different families, with high confidence — refused. */
    | "mismatch"
    /** Declared, but the document did not reveal its family. */
    | "unknown"
    /** Nothing was declared (onboarding, bulk extract): nothing to check. */
    | "not_declared"

/**
 * Why a verdict is `requires_review` rather than `validated`. The first two are
 * resolvable by the person confirming; the rest never are.
 */
export type ReviewReason =
    | "branch_unknown"
    | "medium_insurance_confidence"
    | "scan_unclassified"
    | "classifier_unavailable"
    | "consent_required_for_classification"

export const USER_RESOLVABLE_REVIEW_REASONS: ReadonlySet<ReviewReason> = new Set<ReviewReason>([
    "branch_unknown",
    "medium_insurance_confidence",
    "scan_unclassified",
])

export type GateSurface =
    | "wallet_add"
    | "onboarding"
    | "wallet_upload"
    | "renewal"
    | "attachment"
    | "agent_scan"
    | "agent_commit"
    | "bulk_extract"
    | "worker_lazy"

/** `policy`: the document must be able to BECOME a policy. `attachment`: it joins one that exists. */
export type GateMode = "policy" | "attachment"

export interface GateEvidence {
    pageCount: number
    textChars: number
    imageOnly: boolean
    /** Evidence groups the lexicon found (lexicon.ts EVIDENCE_GROUPS). */
    groupsHit: string[]
    /** Distinct branch-family terms found, per family. */
    branchScores: Partial<Record<BranchFamily, number>>
    /** The strongest non-insurance type the lexicon saw, if any. */
    negativeType: string | null
    classifier: "deterministic" | "model" | "none"
    modelTokens?: number
    /** The model reading came from a verdict recorded minutes earlier for the same bytes. */
    reusedPriorVerdict?: boolean
}

export const GATE_ENGINE_VERSION = "docgate-1" as const

/** ActivityLog action types the gate writes — one per verdict. userId only; metadata carries no text and no file name. */
export const GATE_ACTIVITY = {
    validated: "DOCUMENT_VALIDATED",
    requires_review: "DOCUMENT_REVIEW_REQUIRED",
    rejected: "DOCUMENT_REJECTED",
} as const

export interface DocumentValidationResult {
    status: ValidationStatus
    /** Set when status is `rejected` or `requires_review`; one of the shared failure vocabulary. */
    code?: BatchFailureCode
    documentType: DocumentType
    insuranceConfidence: number
    detectedBranch: BranchFamily | null
    branchConfidence: number
    declaredBranch: string | null
    branchConsistency: BranchConsistency
    reviewReasons: ReviewReason[]
    evidence: GateEvidence
    /** SHA-256 hex of the bytes — the same column the extraction cache keys on. */
    documentHash: string
    engineVersion: typeof GATE_ENGINE_VERSION
    latencyMs: number
    /** The user's own policy this document duplicates (DUPLICATE_DOCUMENT). */
    existingPolicyId?: string
}
