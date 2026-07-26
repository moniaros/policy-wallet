/**
 * Soft stage gates (blueprint §H) — config-driven, never a hard wall except the
 * admin-settable compliance sub-gate. Every gate returns what is missing so the
 * UI can show a warning with "proceed anyway (log reason)" instead of blocking.
 */

import { getMedicConfig, type GateMode, type MedicConfig } from '@/lib/medic/config'
import type { MedicPain, MedicScoreResult } from '@/lib/medic/types'

export interface GateResult {
    /** True when nothing is missing OR the gate mode lets it pass. */
    allowed: boolean
    mode: GateMode
    /** Missing "good-enough" items — empty when the bar is met. */
    missing: string[]
}

function applyMode(mode: GateMode, missing: string[]): GateResult {
    if (missing.length === 0) return { allowed: true, mode, missing }
    // 'warn' allows proceeding (the caller logs the reason); 'block' does not.
    return { allowed: mode !== 'block', mode, missing }
}

/** Opportunity → qualified (§H row 1). The score result already carries the
 *  good-enough checklist; this only applies the configured mode. */
export function gateOpportunityQualified(
    score: MedicScoreResult,
    config: MedicConfig = getMedicConfig()
): GateResult {
    if (config.gateMode === 'off') return { allowed: true, mode: 'off', missing: [] }
    return applyMode(config.gateMode, score.missing)
}

export interface RenewalGateInput {
    /** Lifecycle says the policy expires inside the actionable window — from REAL dates. */
    expiresInWindow: boolean
    ownerAssigned: boolean
    consentToContact: boolean
    /** Lifecycle resolution already marked this a false positive (e.g. renewed). */
    knownFalsePositive: boolean
}

/** Renewal → actionable (§H row 2): expiring (real dates) + owner + consent +
 *  not a known false positive. False positives are suppressed outright. */
export function gateRenewalActionable(
    input: RenewalGateInput,
    config: MedicConfig = getMedicConfig()
): GateResult {
    if (input.knownFalsePositive) {
        // Suppression is not a soft warning — a renewed policy must never nag.
        return { allowed: false, mode: config.gateMode, missing: ['false_positive'] }
    }
    const missing: string[] = []
    if (!input.expiresInWindow) missing.push('expiry_window')
    if (!input.ownerAssigned) missing.push('owner')
    if (!input.consentToContact) missing.push('consent_to_contact')
    if (config.gateMode === 'off') return { allowed: true, mode: 'off', missing }
    return applyMode(config.gateMode, missing)
}

/**
 * Renewal → opportunity Pain auto-link (§K Now): when an opportunity is opened
 * from an expiring policy, seed medic.pain from the renewal instead of leaving
 * the advisor to retype what the platform already knows.
 */
export function buildRenewalPain(input: {
    policyName?: string | null
    expiresAt?: string | null
    gapInstanceIds?: string[]
}): MedicPain {
    return {
        category: 'renewal_lapse',
        gapInstanceIds: input.gapInstanceIds ?? [],
        summary: input.policyName
            ? `${input.policyName}${input.expiresAt ? ` — ${input.expiresAt}` : ''}`
            : undefined,
        severity: 'high',
        quantified: false,
        // A lapsing renewal is real-date evidence, not an AI guess — the advisor
        // still confirms, so it enters the ladder at probable.
        validationState: 'probable',
    }
}
