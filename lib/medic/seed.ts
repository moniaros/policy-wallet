/**
 * Seed the MEDIC snapshot at opportunity creation (blueprint §K Now:
 * "Renewal → opportunity Pain auto-link") — the platform already knows the
 * pain evidence (gap / missing line / lapsing renewal), so the advisor never
 * retypes it. Everything seeds at `probable`; confirmation stays human.
 */

import { calculateMedicScore } from '@/lib/medic/score'
import { VALIDATION_RANK, type MedicData, type MedicPain } from '@/lib/medic/types'

export interface SeedInput {
    pain: MedicPain
    /** Contractual compelling event — usually the policy end/renewal date. */
    compellingEventAt?: Date | string | null
}

/**
 * Advance the pain-validation mirror inside an opportunity's medic snapshot
 * when the underlying GapInstance ladder moves (confirmGap / proposal
 * validation). Forward-only, like the ladder itself; returns null when nothing
 * changes so callers can skip the write.
 */


export function advancePainValidation(
    medic: unknown,
    gapId: string,
    newState: 'confirmed' | 'validated'
): MedicData | null {
    if (!medic || typeof medic !== 'object' || Array.isArray(medic)) return null
    const data = medic as MedicData
    const pain = data.pain
    if (!pain) return null
    // Only opportunities whose pain actually references this gap.
    if (!Array.isArray(pain.gapInstanceIds) || !pain.gapInstanceIds.includes(gapId)) return null
    const current = VALIDATION_RANK[pain.validationState ?? 'probable'] ?? 1
    if (current >= VALIDATION_RANK[newState]) return null
    return { ...data, pain: { ...pain, validationState: newState } }
}

export function seedOpportunityMedic(input: SeedInput): {
    medic: MedicData
    medicScore: number
    medicUpdatedAt: Date
} {
    const medic: MedicData = {
        pain: input.pain,
        ...(input.compellingEventAt
            ? {
                  decisionProcess: {
                      compellingEventAt: new Date(input.compellingEventAt).toISOString(),
                  },
              }
            : {}),
    }
    return {
        medic,
        medicScore: calculateMedicScore(medic).score,
        medicUpdatedAt: new Date(),
    }
}
