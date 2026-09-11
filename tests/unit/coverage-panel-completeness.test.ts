import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { AcordDataSchema } from '@/lib/schemas/acord-data'

/**
 * The durable fix for the extracted-but-unrendered class.
 *
 * Five coverage figures across four panels — the health annual limit, the life
 * death benefit, the motor excess and market value, the home rebuild cost — were
 * extracted by the schema and never rendered. Every one shared a signature: a
 * MONETARY field the schema defines for a branch section, with no reference in
 * that branch's coverage panel. Nothing failed; the data was just silently
 * dropped.
 *
 * This asserts the invariant directly: every numeric (amount) field in each
 * canonical acord section is either referenced by its coverage panel, or listed
 * below as a conscious, reasoned exception. A new amount field added to the
 * schema now forces a decision — render it, or say in writing why not — instead
 * of vanishing.
 */

// canonical acord section → { panel that must render its amounts, the local
// variable the panel reads the section through }. The local var matters: matching
// a bare field name also hit label references like `petCopy.annualLimit`, so a
// missing FIELD could pass because a same-named LABEL existed. Match `<var>.field`.
const SECTION_PANEL: Record<string, { path: string; readVar: string }> = {
    vehicle: { path: 'components/wallet/coverage-details/MotorCoverageDetails.tsx', readVar: 'motor' },
    property: { path: 'components/wallet/coverage-details/HomeCoverageDetails.tsx', readVar: 'home' },
    health: { path: 'components/wallet/coverage-details/HealthCoverageDetails.tsx', readVar: 'health' },
    lifeAndInvestment: { path: 'components/wallet/coverage-details/LifeCoverageDetails.tsx', readVar: 'life' },
    pet: { path: 'components/wallet/coverage-details/PetCoverageDetails.tsx', readVar: 'pet' },
}

/**
 * Amount fields that legitimately do NOT belong in the coverage panel, with the
 * reason. Identity/spec figures shown in the policy header, or percentages the
 * panel renders through a different derived field. Keep this list short and
 * justified — it is the escape hatch, not the norm.
 */
const INTENTIONALLY_NOT_IN_PANEL: Record<string, string> = {
    'vehicle.year': 'vehicle identity — shown in the policy header, not a coverage figure',
    'vehicle.namedDriverCount': 'a head count of additional drivers, not a coverage amount — the panel lists the drivers themselves (W5-01)',
    'property.squareMeters': 'property spec — header/identity, not a coverage amount',
    'property.yearBuilt': 'property spec — header/identity, not a coverage amount',
    'pet.age': "the animal's age — identity, not a coverage amount",
    // annualLimitTotal is the LEGACY alias of pet.annualLimit; the panel resolves
    // the canonical field with the alias as fallback, so the alias itself need
    // not be read directly.
    'pet.annualLimitTotal': 'legacy alias of pet.annualLimit — resolved via ?? fallback in the panel',
}

/** Unwrap optional/default/nullable (Zod v4) to the underlying kind. */
function innerType(schema: any): any {
    let t = schema
    while (t?._def?.innerType) t = t._def.innerType
    return t
}
function isNumberField(schema: any): boolean {
    return innerType(schema)?._def?.type === 'number'
}
function sectionShape(section: string): Record<string, unknown> {
    const s = (AcordDataSchema as any).shape[section]
    return s?.unwrap?.()?.shape ?? {}
}

describe('every coverage amount the schema extracts is rendered by its panel', () => {
    for (const [section, { path, readVar }] of Object.entries(SECTION_PANEL)) {
        it(`${section} → ${path.split('/').pop()}`, () => {
            const shape = sectionShape(section)
            const panelSrc = readFileSync(path, 'utf-8')

            const numericFields = Object.entries(shape)
                .filter(([, def]) => isNumberField(def))
                .map(([name]) => name)

            // Sanity: the probe found fields (guards against a schema-shape change
            // silently emptying this list and passing vacuously).
            expect(numericFields.length, `no numeric fields found for ${section}`).toBeGreaterThan(0)

            const missing = numericFields.filter((field) => {
                if (INTENTIONALLY_NOT_IN_PANEL[`${section}.${field}`]) return false
                // Read as `<readVar>.field` (the section object) OR resolved into a
                // local `const field =` — either way the panel actually uses the
                // value, not just a same-named label.
                const asFieldAccess = new RegExp(`\\b${readVar}\\.${field}\\b`)
                const asLocalConst = new RegExp(`\\b(const|let)\\s+\\w*${field.charAt(0).toUpperCase()}${field.slice(1)}\\b`)
                return !asFieldAccess.test(panelSrc) && !asLocalConst.test(panelSrc)
            })

            expect(
                missing,
                `${section}: these amount fields are extracted but never shown in ${path}. ` +
                `Render each, or add it to INTENTIONALLY_NOT_IN_PANEL with a reason.\n  ${missing.join('\n  ')}`,
            ).toEqual([])
        })
    }
})
