/**
 * calculateMedicScore — the transparent qualification score (blueprint §E/§H/§J).
 *
 * Deliberately NOT a black box: each of the six dimensions rates 0 (missing),
 * 1 (partial) or 2 (solid) by rules an advisor can read below; the score is
 * sum/12 × 100. Advisors won't trust an opaque number (§J: "a complex opaque
 * qualification score" is on the never-build list).
 *
 * Qualification (§H "Opportunity → qualified", good-enough bar):
 *   Pain validationState ≥ confirmed  AND  a Metrics number  AND  an
 *   identified Economic Buyer  AND  medicScore ≥ config.qualifiedMinScore.
 * The stakeholder map may be partial — that is fine by design.
 */

import { getMedicConfig, type MedicConfig } from '@/lib/medic/config'
import type {
    MedicData,
    MedicDimensionRatings,
    MedicScoreResult,
} from '@/lib/medic/types'

const VALIDATION_RANK: Record<string, number> = { probable: 1, confirmed: 2, validated: 3 }

function rateMetrics(medic: MedicData): 0 | 1 | 2 {
    const m = medic.metrics
    if (!m) return 0
    // Solid: a quantified € figure. Partial: only a described target outcome.
    if (typeof m.valueAtRisk === 'number' && m.valueAtRisk > 0) return 2
    if (m.targetOutcome && m.targetOutcome.trim().length > 0) return 1
    return 0
}

function rateEconomicBuyer(medic: MedicData): 0 | 1 | 2 {
    const eb = (medic.stakeholders ?? []).filter((s) => s.stance === 'economic_buyer')
    if (eb.length === 0) return 0
    return eb.some((s) => s.identified) ? 2 : 1
}

function rateDecisionCriteria(medic: MedicData): 0 | 1 | 2 {
    const cs = medic.criteria ?? []
    if (cs.length === 0) return 0
    // Solid: a real criteria set (≥3) with every mandatory criterion met.
    const mandatoryMet = cs.filter((c) => c.mandatory).every((c) => c.met === true)
    return cs.length >= 3 && mandatoryMet ? 2 : 1
}

function rateDecisionProcess(medic: MedicData): 0 | 1 | 2 {
    const dp = medic.decisionProcess
    if (!dp) return 0
    const hasEvent = Boolean(dp.compellingEvent || dp.compellingEventAt)
    const hasSteps = (dp.steps?.length ?? 0) > 0
    if (hasEvent && hasSteps) return 2
    return hasEvent || hasSteps ? 1 : 0
}

function rateIdentifyPain(medic: MedicData): 0 | 1 | 2 {
    const pain = medic.pain
    if (!pain) return 0
    const rank = VALIDATION_RANK[pain.validationState ?? 'probable'] ?? 1
    // Solid: the advisor confirmed (or formally validated) the pain — the same
    // ladder GapInstance.validationState carries. Partial: AI-probable.
    return rank >= VALIDATION_RANK.confirmed ? 2 : 1
}

function rateChampion(medic: MedicData): 0 | 1 | 2 {
    const champs = (medic.stakeholders ?? []).filter((s) => s.stance === 'champion')
    if (champs.length === 0) return 0
    // Solid: a champion with engagement evidence (thread/note reference).
    return champs.some((s) => s.identified && s.evidenceRef) ? 2 : 1
}

/** Every compliance/mandatory criterion is met. Vacuously true when none exist
 *  — an opportunity with no tagged compliance criteria has nothing to clear. */
export function complianceClear(medic: MedicData): boolean {
    const cs = (medic.criteria ?? []).filter((c) => c.compliance || c.mandatory)
    return cs.every((c) => c.met === true)
}

export function calculateMedicScore(
    medic: MedicData | null | undefined,
    config: MedicConfig = getMedicConfig()
): MedicScoreResult {
    const data = medic ?? {}
    const ratings: MedicDimensionRatings = {
        metrics: rateMetrics(data),
        economicBuyer: rateEconomicBuyer(data),
        decisionCriteria: rateDecisionCriteria(data),
        decisionProcess: rateDecisionProcess(data),
        identifyPain: rateIdentifyPain(data),
        champion: rateChampion(data),
    }
    const sum =
        ratings.metrics +
        ratings.economicBuyer +
        ratings.decisionCriteria +
        ratings.decisionProcess +
        ratings.identifyPain +
        ratings.champion
    const score = Math.round((sum / 12) * 100)

    const painConfirmed =
        (VALIDATION_RANK[data.pain?.validationState ?? ''] ?? 0) >= VALIDATION_RANK.confirmed
    const hasMetric = typeof data.metrics?.valueAtRisk === 'number' && data.metrics.valueAtRisk > 0
    const ebIdentified = (data.stakeholders ?? []).some(
        (s) => s.stance === 'economic_buyer' && s.identified
    )

    const missing: string[] = []
    if (!painConfirmed) missing.push('pain_confirmed')
    if (!hasMetric) missing.push('metrics_value')
    if (!ebIdentified) missing.push('economic_buyer')
    if (score < config.qualifiedMinScore) missing.push('score_threshold')

    return {
        score,
        ratings,
        complianceClear: complianceClear(data),
        qualified: missing.length === 0,
        missing,
    }
}
