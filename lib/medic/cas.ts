/**
 * Optimistic concurrency for the `Opportunity.medic` JSON snapshot.
 *
 * Every medic writer follows read → merge-in-memory → write-whole-JSON, so two
 * near-simultaneous writers silently lose each other's fields: a € patch that
 * read before a confirm-sync landed writes the pain mirror BACK to probable
 * (regressing the forward-only ladder), and a confirm-sync can drop a
 * just-saved € figure. `medicUpdatedAt` already changes on every write, which
 * makes it a free compare-and-swap stamp: write only where the stamp still
 * matches what was read, otherwise re-read, re-merge, retry.
 *
 * IO is injected so the loop is pure and unit-testable; callers bind it to
 * `db` (or a transaction client) at the call site.
 */

import { calculateMedicScore } from '@/lib/medic/score'
import type { MedicData } from '@/lib/medic/types'

export interface MedicRow {
    medic: unknown
    medicUpdatedAt: Date | null
}

export interface MedicIo {
    read: (opportunityId: string) => Promise<MedicRow | null>
    /** Conditional write: persist only where `medicUpdatedAt` still equals
     *  `expected`. Returns the number of rows updated (0 = lost the race). */
    write: (
        opportunityId: string,
        expected: Date | null,
        medic: MedicData,
        medicScore: number,
        stamp: Date
    ) => Promise<number>
}

/** Returns the next snapshot, or null to signal "nothing to change" (no-op). */
export type MedicMutator = (medic: MedicData | null) => MedicData | null

export type CasResult =
    | { status: 'applied'; medic: MedicData; medicScore: number }
    | { status: 'noop' }
    | { status: 'not_found' }
    | { status: 'conflict' }

/** Bind the CAS loop to a Prisma client — works for both `db` and a
 *  transaction client (structural typing keeps this file db-import-free). */
export function medicIoFor(client: {
    opportunity: {
        findUnique: (args: {
            where: { id: string }
            select: { medic: true; medicUpdatedAt: true }
        }) => Promise<MedicRow | null>
        updateMany: (args: {
            where: { id: string; medicUpdatedAt: Date | null }
            data: { medic: any; medicScore: number; medicUpdatedAt: Date }
        }) => Promise<{ count: number }>
    }
}): MedicIo {
    return {
        read: (id) =>
            client.opportunity.findUnique({
                where: { id },
                select: { medic: true, medicUpdatedAt: true },
            }),
        write: async (id, expected, medic, medicScore, stamp) => {
            const res = await client.opportunity.updateMany({
                where: { id, medicUpdatedAt: expected },
                data: { medic: medic as any, medicScore, medicUpdatedAt: stamp },
            })
            return res.count
        },
    }
}

export async function casUpdateOpportunityMedic(
    io: MedicIo,
    opportunityId: string,
    mutate: MedicMutator,
    maxAttempts = 3
): Promise<CasResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const row = await io.read(opportunityId)
        if (!row) return { status: 'not_found' }

        const next = mutate((row.medic as MedicData | null) ?? null)
        if (!next) return { status: 'noop' }

        const medicScore = calculateMedicScore(next).score
        const updated = await io.write(opportunityId, row.medicUpdatedAt, next, medicScore, new Date())
        if (updated === 1) return { status: 'applied', medic: next, medicScore }
        // Someone wrote between our read and write — re-read and re-merge.
    }
    return { status: 'conflict' }
}
