/**
 * The deterministic classifier: what kind of document is this, how sure are
 * we that it is insurance at all, and which branch family does it belong to?
 *
 * Pure. No I/O, no model. Runs on the normalised text of the first pages
 * (pdf-probe.ts) in well under a millisecond, and is the FIRST thing that
 * looks at an upload's content. Its verdict bands decide whether a model is
 * consulted at all (document-gate.ts):
 *
 *   ≤ REJECT_CONFIDENCE  → rejected here, no model. This is the injection
 *                          defence: text in a non-insurance file never reaches
 *                          a prompt, whatever it says.
 *   ≥ ACCEPT_CONFIDENCE  → accepted here when the type is policy-bearing and
 *                          the branch is consistent, no model.
 *   between              → the cheap classifier model resolves it.
 *
 * Confidence is a function of how many DISTINCT KINDS of statement the text
 * makes (lexicon.ts EVIDENCE_GROUPS), never of how often one word appears.
 */

import {
    ADJACENT_LEXICON,
    ADJACENT_MARKERS,
    BRANCH_LEXICON,
    DATE_PATTERN,
    EVIDENCE_GROUPS,
    EVIDENCE_LEXICON,
    INJECTION_LEXICON,
    NON_INSURANCE_LEXICON,
    NON_INSURANCE_TYPES,
    countDistinctTerms,
    type AdjacentMarker,
    type EvidenceGroup,
    type NonInsuranceType,
} from "./lexicon"
import { BRANCH_FAMILIES, type BranchFamily, type DocumentType } from "./types"

/** At or below: rejected deterministically. */
export const REJECT_CONFIDENCE = 0.2
/** At or above: accepted deterministically (subject to type and branch). */
export const ACCEPT_CONFIDENCE = 0.8
/** A detected family at or above this may contradict a declared branch. */
export const BRANCH_HIGH_CONFIDENCE = 0.9

/** Confidence by number of evidence groups hit (index = groups). */
const CONFIDENCE_BY_GROUPS = [0.05, 0.15, 0.4, 0.6, 0.8, 0.9, 0.93, 0.96, 0.98]

/** A non-insurance type needs this many distinct terms before it counts at all. */
const NEGATIVE_MIN_TERMS = 2
/** ...and this many before it can pull an insurance-looking text down. */
const NEGATIVE_DOMINANT_TERMS = 3

export interface BranchDetection {
    family: BranchFamily | null
    confidence: number
    scores: Record<BranchFamily, number>
}

export interface LexicalClassification {
    insuranceConfidence: number
    documentType: DocumentType
    groupsHit: EvidenceGroup[]
    groupTermCounts: Record<EvidenceGroup, number>
    negativeType: NonInsuranceType | null
    negativeTermCount: number
    adjacentMarkers: Record<AdjacentMarker, number>
    branch: BranchDetection
    /** The text addresses a model (lexicon.ts INJECTION_LEXICON). Always rejected. */
    injectionSuspected: boolean
}

function countDates(normalizedText: string): number {
    const matches = normalizedText.match(DATE_PATTERN)
    return matches ? new Set(matches).size : 0
}

export function detectBranch(normalizedText: string): BranchDetection {
    const scores = {} as Record<BranchFamily, number>
    for (const family of BRANCH_FAMILIES) {
        scores[family] = countDistinctTerms(normalizedText, BRANCH_LEXICON[family])
    }
    const ranked = [...BRANCH_FAMILIES].sort((a, b) => scores[b] - scores[a])
    const top = ranked[0]
    const topScore = scores[top]
    const secondScore = scores[ranked[1]] ?? 0
    const margin = topScore - secondScore

    if (topScore >= 4 && margin >= 2) {
        return { family: top, confidence: Math.min(0.98, BRANCH_HIGH_CONFIDENCE + (topScore - 4) * 0.02), scores }
    }
    if (topScore >= 3 && margin >= 2) {
        return { family: top, confidence: 0.7, scores }
    }
    return { family: null, confidence: topScore > 0 ? 0.3 : 0, scores }
}

export function classifyLexically(normalizedText: string): LexicalClassification {
    const groupTermCounts = {} as Record<EvidenceGroup, number>
    for (const group of EVIDENCE_GROUPS) {
        groupTermCounts[group] = countDistinctTerms(normalizedText, EVIDENCE_LEXICON[group])
    }
    // Two or more dates are the shape of a period even when its label did not
    // survive text extraction (tables often lose their headers).
    if (countDates(normalizedText) >= 2) groupTermCounts.period += 1

    const groupsHit = EVIDENCE_GROUPS.filter((group) => groupTermCounts[group] > 0)
    const has = (group: EvidenceGroup) => groupTermCounts[group] > 0

    let negativeType: NonInsuranceType | null = null
    let negativeTermCount = 0
    for (const type of NON_INSURANCE_TYPES) {
        const count = countDistinctTerms(normalizedText, NON_INSURANCE_LEXICON[type])
        if (count >= NEGATIVE_MIN_TERMS && count > negativeTermCount) {
            negativeType = type
            negativeTermCount = count
        }
    }

    const adjacentMarkers = {} as Record<AdjacentMarker, number>
    for (const marker of ADJACENT_MARKERS) {
        adjacentMarkers[marker] = countDistinctTerms(normalizedText, ADJACENT_LEXICON[marker])
    }

    let insuranceConfidence = CONFIDENCE_BY_GROUPS[Math.min(groupsHit.length, CONFIDENCE_BY_GROUPS.length - 1)]
    if (negativeTermCount >= NEGATIVE_DOMINANT_TERMS) {
        if (groupsHit.length <= 2) {
            // A menu with the word «κάλυψη» on it, a lease that mentions insurance once.
            insuranceConfidence = Math.min(insuranceConfidence, 0.15)
        } else if (groupsHit.length <= 4) {
            // Enough insurance language to matter, enough of something else to
            // doubt it — the model band decides.
            insuranceConfidence = Math.max(0.1, insuranceConfidence - 0.2)
        }
    }

    // Text that talks to the pipeline is not a document about insurance,
    // however many insurance words it borrows. Refused here, before any model.
    const injectionSuspected = countDistinctTerms(normalizedText, INJECTION_LEXICON) > 0
    if (injectionSuspected) insuranceConfidence = Math.min(insuranceConfidence, 0.1)

    // A premium receipt is an INSURANCE document, but what identifies it is the
    // invoice vocabulary; it must not be pulled down as a generic invoice.
    const invoiceTerms = countDistinctTerms(normalizedText, NON_INSURANCE_LEXICON.invoice)
    const looksLikePremiumReceipt = invoiceTerms >= 2 && has("premium") && !has("coverage") && !has("period")
    if (!injectionSuspected && looksLikePremiumReceipt && negativeType === "invoice" && groupsHit.length >= 3) {
        insuranceConfidence = Math.max(insuranceConfidence, CONFIDENCE_BY_GROUPS[Math.min(groupsHit.length, 8)])
    }

    const branch = detectBranch(normalizedText)

    let documentType: DocumentType
    if (insuranceConfidence <= REJECT_CONFIDENCE || groupsHit.length < 2) {
        documentType = "non_insurance"
    } else if (adjacentMarkers.claim >= 2) {
        documentType = "insurance_claim"
    } else if (adjacentMarkers.quotation >= 2 && !has("policy_identifier")) {
        documentType = "insurance_quotation"
    } else if (adjacentMarkers.renewal >= 1 && has("policy_identifier")) {
        documentType = "insurance_renewal"
    } else if (adjacentMarkers.endorsement >= 1 && has("policy_identifier")) {
        documentType = "insurance_endorsement"
    } else if (looksLikePremiumReceipt) {
        documentType = "invoice_payment"
    } else if (has("policy_identifier") && has("insured_party") && (has("premium") || has("period"))) {
        documentType = adjacentMarkers.certificate >= 1 && !has("coverage") ? "insurance_certificate" : "insurance_policy"
    } else if (adjacentMarkers.certificate >= 1 && has("policy_identifier")) {
        documentType = "insurance_certificate"
    } else if (
        adjacentMarkers.terms_guide >= 2 ||
        (!has("policy_identifier") && !has("insured_party") && !has("premium"))
    ) {
        // Insurance words everywhere, no contract: Γενικοί Όροι, a guide, a checklist.
        documentType = "insurance_terms_or_guide"
    } else {
        documentType = "insurance_other"
    }

    return {
        insuranceConfidence,
        documentType,
        groupsHit,
        groupTermCounts,
        negativeType,
        negativeTermCount,
        adjacentMarkers,
        branch,
        injectionSuspected,
    }
}
