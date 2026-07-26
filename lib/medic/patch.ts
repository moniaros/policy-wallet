/**
 * Advisor edits to the qualification snapshot (blueprint §F: each dimension
 * row carries one inline field). Deliberately NARROW: only the fields that no
 * automation can honestly supply — the Metrics € figure and the human
 * judgement that a stakeholder is identified/added. Everything else keeps its
 * existing write path (seeding, confirmGap sync, suggest-and-confirm), and the
 * pain validation ladder stays untouchable here too.
 */

import { z } from 'zod'
import type { MedicData } from '@/lib/medic/types'

const stanceSchema = z.enum(['economic_buyer', 'champion', 'influencer', 'blocker'])

export const medicPatchSchema = z
    .object({
        /** Value-at-risk in EUR; null clears it. */
        valueAtRisk: z.number().min(0).max(10_000_000).nullable().optional(),
        /** Full replacement of the stakeholder map (advisor-owned judgement). */
        stakeholders: z
            .array(
                z.object({
                    name: z.string().min(1).max(120),
                    party: z.string().max(120).optional(),
                    stance: stanceSchema,
                    identified: z.boolean().optional(),
                    evidenceRef: z.string().max(200).optional(),
                })
            )
            .max(12)
            .optional(),
    })
    .strict()

export type MedicPatch = z.infer<typeof medicPatchSchema>

export function validateMedicPatch(input: unknown): MedicPatch | null {
    const result = medicPatchSchema.safeParse(input)
    return result.success ? result.data : null
}

/** Pure merge — only the whitelisted fields move; pain/criteria/process are
 *  never touched by this path. */
export function applyMedicPatch(medic: MedicData | null | undefined, patch: MedicPatch): MedicData {
    const base: MedicData = medic ? { ...medic } : {}
    if ('valueAtRisk' in patch) {
        const existing = base.metrics ?? {}
        base.metrics =
            patch.valueAtRisk === null
                ? { ...existing, valueAtRisk: undefined }
                : { ...existing, valueAtRisk: patch.valueAtRisk }
    }
    if (patch.stakeholders) {
        base.stakeholders = patch.stakeholders
    }
    return base
}
