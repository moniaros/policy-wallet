import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveClaimsContact } from '@/lib/wallet/claims-contact'
import { AcordDataSchema } from '@/lib/schemas/acord-data'

/**
 * The claims card read `acordData.policy.insurerContact` — a field that exists
 * in no schema. The string appeared exactly once in the repository, on the line
 * that read it, so `insurerPhone` was always empty: the "Contact insurer" button
 * never rendered on any policy, its handler was unreachable, and every
 * policyholder opening the claims screen after a loss was told the document had
 * no claims number in it.
 *
 * It usually did, and the pipeline had extracted it.
 */
describe('the claims screen offers the number the document gave', () => {
    it('gives a motor policy its accident-care line', () => {
        // motor.ts's own first claim step is "call your insurer's accident-care
        // line FIRST" — this is that number.
        const acord: any = { vehicle: { accidentDeclarationPhone: '210 999 8888' } }
        expect(resolveClaimsContact(acord, 'motor')).toEqual({
            phone: '210 999 8888',
            kind: 'accident_declaration',
        })
    })

    it('prefers accident care over roadside', () => {
        // A breakdown line cannot register a claim.
        const acord: any = {
            vehicle: { accidentDeclarationPhone: '210 999 8888', roadsideAssistancePhone: '210 111 2222' },
        }
        expect(resolveClaimsContact(acord, 'motor')?.kind).toBe('accident_declaration')
    })

    it('falls back to roadside when that is all the document gave', () => {
        const acord: any = { vehicle: { roadsideAssistancePhone: '210 111 2222' } }
        expect(resolveClaimsContact(acord, 'motor')).toEqual({ phone: '210 111 2222', kind: 'roadside' })
    })

    it('gives a home policy its technical-assistance line', () => {
        const acord: any = { property: { technicalAssistancePhone: '210 333 4444' } }
        expect(resolveClaimsContact(acord, 'home')?.kind).toBe('technical_assistance')
    })

    it('gives a health policy the coordination centre', () => {
        // The number that authorises admission and direct billing — the one
        // that matters standing in a hospital.
        const acord: any = { health: { coordinationCentre: { phone: '210 555 6666' } } }
        expect(resolveClaimsContact(acord, 'health')).toEqual({
            phone: '210 555 6666',
            kind: 'coordination_centre',
        })
    })

    it('resolves child branches to their parent family', () => {
        const motorbike: any = { vehicle: { accidentDeclarationPhone: '210 999 8888' } }
        expect(resolveClaimsContact(motorbike, 'motorbike')?.phone).toBe('210 999 8888')
        const renters: any = { property: { technicalAssistancePhone: '210 333 4444' } }
        expect(resolveClaimsContact(renters, 'renters')?.phone).toBe('210 333 4444')
    })

    it('reads the legacy alias too', () => {
        // Rows stored under the pre-canonical key names still have a number.
        const acord: any = { motor: { accidentDeclarationPhone: '210 777 0000' } }
        expect(resolveClaimsContact(acord, 'motor')?.phone).toBe('210 777 0000')
    })

    it('returns null rather than offering a number that is not theirs', () => {
        expect(resolveClaimsContact({ vehicle: {} } as any, 'motor')).toBeNull()
        expect(resolveClaimsContact({} as any, 'travel')).toBeNull()
        expect(resolveClaimsContact(null, 'motor')).toBeNull()
        // A motor number must not be offered to a home policy.
        const acord: any = { vehicle: { accidentDeclarationPhone: '210 999 8888' } }
        expect(resolveClaimsContact(acord, 'home')).toBeNull()
    })

    it('ignores a whitespace-only phone', () => {
        expect(resolveClaimsContact({ vehicle: { accidentDeclarationPhone: '   ' } } as any, 'motor')).toBeNull()
    })

    /**
     * Asserted over the WHOLE taxonomy rather than the three branches the
     * resolver names. The first version of this suite checked `travel` and
     * `cyber` by hand, so a mutation that turned the `default` arm into
     * `case "travel": case "cyber":` — leaving every other branch falling out of
     * the switch and returning `undefined` — passed all eleven tests. Naming the
     * cases you already thought of tests nothing.
     */
    it('returns null, never undefined, for every branch in the taxonomy', async () => {
        const { INSURANCE_BRANCHES } = await import('@/lib/insurance/taxonomy')
        // An envelope carrying every claims number the schema models: whatever
        // branch is asked for, a number is available to be wrongly returned.
        const acord: any = {
            vehicle: { accidentDeclarationPhone: '210 999 8888', roadsideAssistancePhone: '210 111 2222' },
            property: { technicalAssistancePhone: '210 333 4444' },
            health: { coordinationCentre: { phone: '210 555 6666' } },
        }
        const withPanel = new Set(['motor', 'home', 'health'])
        for (const branch of INSURANCE_BRANCHES) {
            const result = resolveClaimsContact(acord, branch.id)
            const family = (branch.parentId ?? branch.id).toLowerCase()
            if (withPanel.has(family)) {
                expect(result, `${branch.id} should resolve a claims line`).not.toBeNull()
            } else {
                // Not undefined — a branch with no modelled claims line must
                // return the same "we have nothing" value as an empty envelope.
                expect(result, `${branch.id} must not borrow another branch's number`).toBeNull()
            }
        }
    })
})

/**
 * The root cause was a field name nobody validated. Assert the property the
 * original bug violated: the page may only read acord paths the schema defines.
 */
describe('the page reads acord fields that exist', () => {
    it('no longer reads the phantom insurerContact', () => {
        const src = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf-8')
        const uncommented = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        expect(uncommented).not.toMatch(/insurerContact/)
    })

    it('confirms insurerContact is not a schema field, so it could never be set', () => {
        const shape = (AcordDataSchema as any).shape
        const policyShape = shape.policy?.unwrap?.()?.shape ?? {}
        expect(Object.keys(policyShape)).not.toContain('insurerContact')
        // …and the fields the resolver DOES read are real.
        const vehicleShape = shape.vehicle?.unwrap?.()?.shape ?? {}
        expect(Object.keys(vehicleShape)).toContain('accidentDeclarationPhone')
        expect(Object.keys(vehicleShape)).toContain('roadsideAssistancePhone')
        const propertyShape = shape.property?.unwrap?.()?.shape ?? {}
        expect(Object.keys(propertyShape)).toContain('technicalAssistancePhone')
    })
})
