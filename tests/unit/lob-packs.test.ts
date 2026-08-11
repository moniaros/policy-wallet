import { describe, expect, it } from 'vitest'

import { INSURANCE_BRANCHES } from '@/lib/insurance/taxonomy'
import { LOB_PACKS, lobPackBlock, lobPackProvenance, packForLineOfBusiness } from '@/lib/services/ai/lob-packs'
import { buildExtractionPrompt } from '@/lib/services/ai/prompts'

/**
 * Layer 2 of the prompt architecture.
 *
 * The value of a pack is that it is CONDITIONAL. A single prompt carrying cargo
 * clause guidance, safe sub-limit guidance and crew benefit-table guidance would
 * be long, and for any one policy, nineteen twentieths irrelevant. The test that
 * matters most here is therefore the one asserting that a motor policy's prompt
 * does not change at all.
 */
describe('LoB packs — selection', () => {
    it('resolves the marine pack from every branch it claims', () => {
        expect(packForLineOfBusiness('boat_hull')?.id).toBe('marine_hull')
        expect(packForLineOfBusiness('marine_hull')?.id).toBe('marine_hull')
        expect(packForLineOfBusiness('marine_cargo')?.id).toBe('marine_cargo')
        expect(packForLineOfBusiness('marine_crew')?.id).toBe('marine_crew')
    })

    it('resolves through free-form and Greek input, not just canonical ids', () => {
        expect(packForLineOfBusiness('ΚΛΑΔΟΣ ΜΕΤΑΦΟΡΩΝ')?.id).toBe('marine_cargo')
        expect(packForLineOfBusiness('CASH IN TRANSIT')?.id).toBe('crime_and_valuables')
        expect(packForLineOfBusiness('FINE ART')?.id).toBe('crime_and_valuables')
    })

    it('falls back to the branch family for a child with no pack of its own', () => {
        // `boat` carries the marine pack; a child branch inherits it rather than
        // silently getting no guidance.
        expect(packForLineOfBusiness('boat')?.id).toBe('marine_hull')
    })

    it('returns null for lines Layer 1 already covers well', () => {
        expect(packForLineOfBusiness('motor')).toBeNull()
        expect(packForLineOfBusiness('health')).toBeNull()
        expect(packForLineOfBusiness('home')).toBeNull()
        expect(packForLineOfBusiness(null)).toBeNull()
        expect(packForLineOfBusiness('')).toBeNull()
    })
})

describe('LoB packs — prompt composition', () => {
    it('leaves the prompt byte-identical when no pack applies', () => {
        // The single most important guarantee in this change: motor and health
        // extraction must not move at all.
        expect(buildExtractionPrompt(undefined, 'motor')).toBe(buildExtractionPrompt())
        expect(buildExtractionPrompt(undefined, 'health')).toBe(buildExtractionPrompt())
        expect(lobPackBlock('motor')).toBe('')
    })

    it('appends the pack when one applies', () => {
        const base = buildExtractionPrompt()
        const cargo = buildExtractionPrompt(undefined, 'marine_cargo')
        expect(cargo).not.toBe(base)
        expect(cargo.startsWith(base.slice(0, 200))).toBe(true)
        expect(cargo).toContain('LINE-OF-BUSINESS GUIDANCE — marine_cargo')
        expect(cargo).toContain('Institute Cargo Clauses')
    })

    it('keeps operator guidance last, below the pack', () => {
        // Packs are engineering artefacts under review; operator guidance is
        // admin-authored and must stay the most subordinate voice in the prompt.
        const prompt = buildExtractionPrompt('Prefer the Greek spelling of insurer names.', 'marine_cargo')
        expect(prompt.indexOf('LINE-OF-BUSINESS GUIDANCE')).toBeLessThan(prompt.indexOf('OPERATOR GUIDANCE'))
    })

    it('stamps provenance so a conclusion is traceable to its guidance', () => {
        expect(lobPackProvenance('marine_cargo')).toEqual({ packId: 'marine_cargo', packVersion: '1.0.0' })
        expect(lobPackProvenance('motor')).toBeNull()
    })
})

describe('LoB packs — registry integrity', () => {
    it('has unique ids', () => {
        const ids = LOB_PACKS.map((p) => p.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('claims only branches that exist in the taxonomy', () => {
        const known = new Set(INSURANCE_BRANCHES.map((b) => b.id))
        for (const pack of LOB_PACKS) {
            for (const branchId of pack.branchIds) {
                expect(known.has(branchId), `${pack.id} claims unknown branch "${branchId}"`).toBe(true)
            }
        }
    })

    it('never has two packs claiming the same branch', () => {
        const claimed = new Map<string, string>()
        for (const pack of LOB_PACKS) {
            for (const branchId of pack.branchIds) {
                expect(claimed.has(branchId), `${branchId} claimed by both ${claimed.get(branchId)} and ${pack.id}`).toBe(false)
                claimed.set(branchId, pack.id)
            }
        }
    })

    it('gives every pack terminology, hints and evidence rules', () => {
        for (const pack of LOB_PACKS) {
            expect(pack.terminology.length, pack.id).toBeGreaterThan(0)
            expect(pack.extractionHints.length, pack.id).toBeGreaterThan(0)
            expect(pack.evidenceRules.length, pack.id).toBeGreaterThan(0)
            expect(pack.version, pack.id).toMatch(/^\d+\.\d+\.\d+$/)
        }
    })

    it('forbids the two packs handling personal data from asking for names', () => {
        // Fidelity schedules list ~45 employees and crew schedules 21 seafarers.
        // Those are third parties whose data PolicyWallet has no basis to ingest.
        for (const id of ['marine_crew', 'crime_and_valuables']) {
            const pack = LOB_PACKS.find((p) => p.id === id)!
            const rules = pack.evidenceRules.join(' ')
            expect(rules, id).toMatch(/NEVER extract the names/)
        }
    })
})
