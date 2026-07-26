/**
 * MEDIC advisor patch (blueprint §F inline fields) — validation + pure merge.
 * The patch path is the ONLY UI writer for metrics.valueAtRisk and stakeholder
 * identification, so these tests also pin that `qualified` is reachable:
 * seeded pain + confirm + € figure + identified EB must cross the gate.
 */

import { describe, it, expect } from 'vitest'
import { validateMedicPatch, applyMedicPatch } from '@/lib/medic/patch'
import { calculateMedicScore } from '@/lib/medic/score'
import type { MedicData } from '@/lib/medic/types'

describe('validateMedicPatch', () => {
    it('accepts a valueAtRisk-only patch', () => {
        expect(validateMedicPatch({ valueAtRisk: 25000 })).toEqual({ valueAtRisk: 25000 })
    })

    it('accepts null to clear valueAtRisk', () => {
        expect(validateMedicPatch({ valueAtRisk: null })).toEqual({ valueAtRisk: null })
    })

    it('rejects negative, oversized, and non-numeric valueAtRisk', () => {
        expect(validateMedicPatch({ valueAtRisk: -1 })).toBeNull()
        expect(validateMedicPatch({ valueAtRisk: 10_000_001 })).toBeNull()
        expect(validateMedicPatch({ valueAtRisk: '25000' })).toBeNull()
    })

    it('accepts a stakeholder replacement with known stances', () => {
        const patch = validateMedicPatch({
            stakeholders: [{ name: 'Μαρία', stance: 'economic_buyer', identified: true }],
        })
        expect(patch?.stakeholders?.[0]?.identified).toBe(true)
    })

    it('rejects unknown stances, empty names, and oversized lists', () => {
        expect(validateMedicPatch({ stakeholders: [{ name: 'X', stance: 'ceo' }] })).toBeNull()
        expect(validateMedicPatch({ stakeholders: [{ name: '', stance: 'champion' }] })).toBeNull()
        expect(
            validateMedicPatch({
                stakeholders: Array.from({ length: 13 }, (_, i) => ({ name: `S${i}`, stance: 'influencer' })),
            })
        ).toBeNull()
    })

    it('rejects unknown top-level fields (strict) — the pain ladder is not patchable', () => {
        expect(validateMedicPatch({ pain: { validationState: 'validated' } })).toBeNull()
        expect(validateMedicPatch({ valueAtRisk: 1, extra: true })).toBeNull()
    })
})

describe('applyMedicPatch', () => {
    const base: MedicData = {
        pain: { summary: 'Ακάλυπτος σεισμός', validationState: 'confirmed', severity: 'high', gapInstanceIds: ['g1'] },
        metrics: { targetOutcome: 'Κάλυψη κατοικίας' },
        stakeholders: [{ name: 'Νίκος', stance: 'champion' }],
    }

    it('sets valueAtRisk without dropping other metrics fields', () => {
        const next = applyMedicPatch(base, { valueAtRisk: 180000 })
        expect(next.metrics?.valueAtRisk).toBe(180000)
        expect(next.metrics?.targetOutcome).toBe('Κάλυψη κατοικίας')
        expect(next.pain).toEqual(base.pain)
    })

    it('clears valueAtRisk on null', () => {
        const withVar = applyMedicPatch(base, { valueAtRisk: 180000 })
        const cleared = applyMedicPatch(withVar, { valueAtRisk: null })
        expect(cleared.metrics?.valueAtRisk).toBeUndefined()
        expect(cleared.metrics?.targetOutcome).toBe('Κάλυψη κατοικίας')
    })

    it('replaces the stakeholder map wholesale', () => {
        const next = applyMedicPatch(base, {
            stakeholders: [
                { name: 'Νίκος', stance: 'champion', identified: true },
                { name: 'Μαρία', stance: 'economic_buyer', identified: true },
            ],
        })
        expect(next.stakeholders).toHaveLength(2)
        expect(next.stakeholders?.every((s) => s.identified)).toBe(true)
    })

    it('never touches pain/criteria/decisionProcess', () => {
        const rich: MedicData = {
            ...base,
            criteria: [{ key: 'idd', label: 'IDD', compliance: true, mandatory: true, met: true }],
            decisionProcess: { compellingEventAt: '2026-09-12' },
        }
        const next = applyMedicPatch(rich, { valueAtRisk: 1000, stakeholders: [] })
        expect(next.pain).toEqual(rich.pain)
        expect(next.criteria).toEqual(rich.criteria)
        expect(next.decisionProcess).toEqual(rich.decisionProcess)
    })

    it('works from an empty/null snapshot', () => {
        const next = applyMedicPatch(null, { valueAtRisk: 500 })
        expect(next.metrics?.valueAtRisk).toBe(500)
    })
})

describe('qualified is reachable through the patch path', () => {
    it('confirmed pain + € figure + identified EB crosses the gate', () => {
        // What the seed + confirmGap sync leave behind:
        const afterConfirm: MedicData = {
            pain: { summary: 'Κενό αστικής ευθύνης', validationState: 'confirmed', severity: 'high', gapInstanceIds: ['g1'] },
            decisionProcess: { compellingEventAt: '2026-09-12' },
        }
        expect(calculateMedicScore(afterConfirm).qualified).toBe(false)

        // The two §F inline edits this feature adds:
        const patched = applyMedicPatch(afterConfirm, { valueAtRisk: 25000 })
        const done = applyMedicPatch(patched, {
            stakeholders: [{ name: 'Μαρία', stance: 'economic_buyer', identified: true }],
        })

        const result = calculateMedicScore(done)
        expect(result.qualified).toBe(true)
        expect(result.score).toBeGreaterThanOrEqual(50)
    })
})
