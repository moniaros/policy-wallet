import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const WIZARD = strip(readFileSync('components/coverage/RiskProfileWizard.tsx', 'utf-8'))
const ROUTE = strip(readFileSync('app/api/v1/risk-profile/route.ts', 'utf-8'))

/**
 * The route validates with Zod and returns `parsed.error.issues` — field-level
 * detail naming exactly what was rejected. The wizard discarded it and showed
 * "Αποτυχία αποθήκευσης" / "Failed to save".
 *
 * That form spans several steps and about twenty fields, including the Art. 9
 * health data. Height outside 50–250cm and a malformed life-event date produced
 * the same message, so the only recourse was to guess or abandon — abandoning
 * the health data just entered.
 */
describe('a rejected risk profile names the field', () => {
    it('the route really does return field-level issues', () => {
        expect(ROUTE).toMatch(/createApiError\('VALIDATION_ERROR', 'Invalid data', 400, parsed\.error\.issues\)/)
    })

    it('the wizard reads them instead of throwing them away', () => {
        expect(WIZARD).not.toMatch(/throw new Error\("Failed to save profile"\)/)
        expect(WIZARD).toMatch(/await response\.json\(\)\.catch\(\(\) => null\)/)
        expect(WIZARD).toMatch(/body\?\.error\?\.details/)
    })

    it('maps each rejected path to a label, not a schema key', () => {
        expect(WIZARD).toMatch(/const FIELD_LABELS: Record<string, \{ el: string; en: string \}>/)
        for (const key of ['heightCm', 'weightKg', 'dateOfBirth', 'lifeEvents', 'chronicConditions']) {
            expect(WIZARD, key).toMatch(new RegExp(`${key}: \\{ el:`))
        }
    })

    it('every constrained field in the schema has a label', () => {
        // Fields with a min/max/enum/format constraint are the ones that can be
        // rejected — each must be nameable.
        const constrained = [...ROUTE.matchAll(/^\s{2}(\w+): z\.[^\n]*(min\(|max\(|datetime\(|enum\()/gm)]
            .map((m) => m[1])
            .filter((f) => !['maritalStatus', 'employmentStatus', 'riskTolerance', 'smokingStatus', 'gender', 'drivingRecord', 'activityLevel'].includes(f))
        const missing = constrained.filter((f) => !new RegExp(`${f}: \\{ el:`).test(WIZARD))
        expect(missing, `constrained fields with no label:\n${missing.join('\n')}`).toEqual([])
    })

    it('falls back to the generic message when no field is named', () => {
        expect(WIZARD).toMatch(/Αποτυχία αποθήκευσης/)
    })

    it('does not clear the form on failure — the health data is expensive to re-enter', () => {
        const submit = WIZARD.slice(WIZARD.indexOf('const response = await fetch("/api/v1/risk-profile"'))
        const upToCatch = submit.slice(0, submit.indexOf('} finally {'))
        expect(upToCatch).not.toMatch(/setChronicConditions\(\[\]\)|setStep\(0\)/)
    })
})
