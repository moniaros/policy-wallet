/**
 * Cross-sell advisor-ready gate (blueprint §G promise 7 / §H row 3).
 *
 * An AI cross-sell suggestion is "advisor-ready" — eligible to be put in front
 * of the customer as a recommendation — only when:
 *   evidence   the linked gap's validationState is ≥ confirmed (an advisor
 *              agreed the pain is real), and
 *   confidence the extraction confidence behind the evidence clears the
 *              configured threshold, and
 *   standing   it has not been dismissed.
 * Below the bar it STAYS IN THE AGENT'S QUEUE — never silently shown to the
 * customer. This is the line between an informational insight and a documented
 * recommendation (IDD / Law 4583/2018).
 */

import { getMedicConfig, type MedicConfig } from '@/lib/medic/config'

const VALIDATION_RANK: Record<string, number> = { probable: 1, confirmed: 2, validated: 3 }

export interface CrossSellGateInput {
    gapValidationState?: 'probable' | 'confirmed' | 'validated' | null
    /** 0–1 extraction confidence behind the evidence; null = unknown. */
    extractionConfidence?: number | null
    dismissed: boolean
}

export interface CrossSellGateResult {
    ready: boolean
    missing: string[]
}

export function crossSellAdvisorReady(
    input: CrossSellGateInput,
    config: MedicConfig = getMedicConfig()
): CrossSellGateResult {
    const missing: string[] = []
    if ((VALIDATION_RANK[input.gapValidationState ?? ''] ?? 0) < VALIDATION_RANK.confirmed) {
        missing.push('pain_confirmed')
    }
    // Unknown confidence does NOT pass — the gate is evidence-positive, never
    // benefit-of-the-doubt.
    if (!(typeof input.extractionConfidence === 'number' && input.extractionConfidence >= config.minEvidenceConfidence)) {
        missing.push('evidence_confidence')
    }
    if (input.dismissed) missing.push('dismissed')
    return { ready: missing.length === 0, missing }
}
