/**
 * Qualification health over an agent's open pipeline (blueprint §F: the
 * dashboard tile — "share of pipeline € with strong MEDIC; count missing
 * EB/Champion"). Pure so the dashboard assembly stays testable.
 */

import { getMedicConfig, type MedicConfig } from '@/lib/medic/config'
import type { MedicData } from '@/lib/medic/types'

/** Statuses that constitute the OPEN pipeline (mirrors the pipeline tabs). */
const OPEN_PIPELINE = new Set(['open', 'contacted', 'quoted'])

export interface QualificationHealth {
    /** Open-pipeline opportunities considered. */
    pipelineCount: number
    /** Sum of estimatedPremium over the open pipeline (EUR). */
    pipelineEur: number
    /** Same sum, restricted to opportunities at/over the qualification score. */
    qualifiedEur: number
    /** Open opportunities with NO economic-buyer stakeholder at all. */
    missingEb: number
    /** Open opportunities whose pain is absent or still AI-probable. */
    unconfirmedPain: number
}

export function computeQualificationHealth(
    opportunities: Array<{
        status: string
        estimatedPremium: number | null
        medicScore: number | null
        medic: unknown
    }>,
    config: MedicConfig = getMedicConfig()
): QualificationHealth {
    let pipelineCount = 0
    let pipelineEur = 0
    let qualifiedEur = 0
    let missingEb = 0
    let unconfirmedPain = 0

    for (const opp of opportunities) {
        if (!OPEN_PIPELINE.has(opp.status)) continue
        pipelineCount++
        const eur = typeof opp.estimatedPremium === 'number' ? opp.estimatedPremium : 0
        pipelineEur += eur
        if ((opp.medicScore ?? 0) >= config.qualifiedMinScore) qualifiedEur += eur

        // Defensive JSON read: medic is unknown DB JSON; malformed data counts
        // as missing evidence, never throws the dashboard.
        const medic = (opp.medic && typeof opp.medic === 'object' ? opp.medic : {}) as MedicData
        const hasEb = Array.isArray(medic.stakeholders)
            && medic.stakeholders.some((s) => s && s.stance === 'economic_buyer')
        if (!hasEb) missingEb++
        const painState = medic.pain?.validationState
        if (painState !== 'confirmed' && painState !== 'validated') unconfirmedPain++
    }

    return { pipelineCount, pipelineEur, qualifiedEur, missingEb, unconfirmedPain }
}
