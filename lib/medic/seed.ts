/**
 * Seed the MEDIC snapshot at opportunity creation (blueprint §K Now:
 * "Renewal → opportunity Pain auto-link") — the platform already knows the
 * pain evidence (gap / missing line / lapsing renewal), so the advisor never
 * retypes it. Everything seeds at `probable`; confirmation stays human.
 */

import { calculateMedicScore } from '@/lib/medic/score'
import type { MedicData, MedicPain } from '@/lib/medic/types'

export interface SeedInput {
    pain: MedicPain
    /** Contractual compelling event — usually the policy end/renewal date. */
    compellingEventAt?: Date | string | null
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
