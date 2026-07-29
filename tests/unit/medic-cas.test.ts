/**
 * Optimistic CAS for Opportunity.medic — the guard that stops the four
 * read→merge→write-whole-JSON writers (patch, apply-suggestions, confirm-sync,
 * proposal-sync) from silently overwriting each other's fields. The headline
 * scenario: a € patch racing a confirm-sync must end with BOTH the € figure
 * and the advanced pain ladder, never a regression.
 */

import { describe, it, expect } from 'vitest'
import { casUpdateOpportunityMedic, type MedicIo, type MedicRow } from '@/lib/medic/cas'
import { applyMedicPatch } from '@/lib/medic/patch'
import { advancePainValidation } from '@/lib/medic/seed'
import type { MedicData } from '@/lib/medic/types'

/** In-memory store speaking the MedicIo contract, with the same stamp-guarded
 *  conditional write the Prisma updateMany performs. */
function makeStore(initial: MedicData | null) {
    const state: { row: MedicRow | null } = {
        row: { medic: initial, medicUpdatedAt: null },
    }
    const io: MedicIo = {
        read: async () => (state.row ? { ...state.row } : null),
        write: async (_id, expected, medic, _score, stamp) => {
            if (!state.row) return 0
            const current = state.row.medicUpdatedAt?.getTime() ?? null
            const exp = expected?.getTime() ?? null
            if (current !== exp) return 0
            state.row = { medic, medicUpdatedAt: stamp }
            return 1
        },
    }
    return { state, io }
}

const seeded: MedicData = {
    pain: { summary: 'Κενό', validationState: 'probable', severity: 'high', gapInstanceIds: ['g1'] },
    decisionProcess: { compellingEventAt: '2026-09-12' },
}

describe('casUpdateOpportunityMedic', () => {
    it('applies on the happy path and returns the recomputed score', async () => {
        const { state, io } = makeStore(seeded)
        const res = await casUpdateOpportunityMedic(io, 'o1', (m) => applyMedicPatch(m, { valueAtRisk: 25000 }))
        expect(res.status).toBe('applied')
        if (res.status === 'applied') {
            expect(res.medic.metrics?.valueAtRisk).toBe(25000)
            expect(res.medicScore).toBeGreaterThan(0)
        }
        expect((state.row?.medic as MedicData).metrics?.valueAtRisk).toBe(25000)
    })

    it('returns noop (and writes nothing) when the mutator declines', async () => {
        const { state, io } = makeStore(seeded)
        const before = state.row
        // Wrong gap id → advancePainValidation returns null.
        const res = await casUpdateOpportunityMedic(io, 'o1', (m) => advancePainValidation(m, 'other-gap', 'confirmed'))
        expect(res.status).toBe('noop')
        expect(state.row).toBe(before)
    })

    it('returns not_found for a missing row', async () => {
        const { state, io } = makeStore(seeded)
        state.row = null
        const res = await casUpdateOpportunityMedic(io, 'o1', (m) => applyMedicPatch(m, { valueAtRisk: 1 }))
        expect(res.status).toBe('not_found')
    })

    it('retries after losing the race and preserves the interleaved write — € patch vs confirm-sync', async () => {
        const { state, io } = makeStore(seeded)
        // Simulate a confirm-sync landing between the patch's read and write:
        // the first read hands out the pre-sync snapshot, then the store moves.
        let interleaved = false
        const racingIo: MedicIo = {
            read: async (id) => {
                const snapshot = await io.read(id)
                if (!interleaved) {
                    interleaved = true
                    const advanced = advancePainValidation(state.row?.medic, 'g1', 'confirmed')
                    state.row = { medic: advanced!, medicUpdatedAt: new Date(1_000) }
                }
                return snapshot
            },
            write: io.write,
        }
        const res = await casUpdateOpportunityMedic(racingIo, 'o1', (m) => applyMedicPatch(m, { valueAtRisk: 25000 }))
        expect(res.status).toBe('applied')
        const final = state.row?.medic as MedicData
        // BOTH survive: the € figure AND the advanced ladder (no regression).
        expect(final.metrics?.valueAtRisk).toBe(25000)
        expect(final.pain?.validationState).toBe('confirmed')
    })

    it('gives up with conflict after maxAttempts of sustained contention', async () => {
        const { io } = makeStore(seeded)
        let writes = 0
        const contendedIo: MedicIo = {
            read: io.read,
            write: async () => {
                writes++
                return 0 // every write loses
            },
        }
        const res = await casUpdateOpportunityMedic(contendedIo, 'o1', (m) => applyMedicPatch(m, { valueAtRisk: 1 }), 3)
        expect(res.status).toBe('conflict')
        expect(writes).toBe(3)
    })
})
