/**
 * MEDIC thresholds & gate configuration (blueprint §E/§H).
 *
 * Kept in config — NOT hardcoded in the score/gate logic — so a later
 * per-Tenant override can shadow these values without touching the engine.
 * (Tenant plumbing itself is a Later item; only the shape is ready for it.)
 */

export type GateMode = 'off' | 'warn' | 'block'

export interface MedicConfig {
    /** medicScore floor for the derived `qualified` boolean (§H: ≥ 50). */
    qualifiedMinScore: number
    /**
     * Soft-gate behaviour for stage transitions. Default 'warn': the agent sees
     * what is missing and may proceed anyway (with a logged reason). Only the
     * admin-settable compliance sub-gate may be 'block' (§H hard exception).
     */
    gateMode: GateMode
    /** The compliance sub-gate may be a hard wall; every other gate never is. */
    complianceGateMode: GateMode
    /**
     * Minimum extraction confidence for evidence-backed figures to count as
     * 'high' confidence metrics (mirrors the cross-sell suppression threshold).
     */
    minEvidenceConfidence: number
}

export const DEFAULT_MEDIC_CONFIG: MedicConfig = {
    qualifiedMinScore: 50,
    gateMode: 'warn',
    complianceGateMode: 'warn',
    minEvidenceConfidence: 0.7,
}

/** Resolve the active config. Per-Tenant overrides land here later (§K). */
export function getMedicConfig(overrides?: Partial<MedicConfig>): MedicConfig {
    return { ...DEFAULT_MEDIC_CONFIG, ...overrides }
}
