import { describe, it, expect } from 'vitest'
import { localizeCoverageName } from '@/lib/i18n/text-format'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * The AI-Insights tab localizes each ACORD coverage via localizeCoverageName;
 * an unknown name falls back to raw English. The map used to be motor-only, so
 * home / life / health perils (earthquake, building, death, critical illness,
 * surgery…) rendered as raw English to a Greek policyholder. They must now
 * localize — including across the casing/separator variants the model emits,
 * which localizeCoverageName normalizes.
 */
const elNames = el.coverage_names as Record<string, string>
const enNames = en.coverage_names as Record<string, string>

const cases: Array<[string, string, string]> = [
    ['EARTHQUAKE', 'Σεισμός', 'Earthquake'],
    ['Earthquake', 'Σεισμός', 'Earthquake'], // casing variant, normalized
    ['building', 'Κτίριο', 'Building'],
    ['Contents', 'Περιεχόμενο', 'Contents'],
    ['Water Damage', 'Ζημιές από νερά', 'Water Damage'],
    ['CRITICAL ILLNESS', 'Σοβαρές ασθένειες', 'Critical Illness'],
    ['Permanent Total Disability', 'Μόνιμη ολική ανικανότητα', 'Permanent Total Disability'],
    ['DEATH', 'Απώλεια ζωής', 'Death'],
    ['Surgery', 'Χειρουργικές επεμβάσεις', 'Surgery'],
    ['Maternity', 'Μητρότητα', 'Maternity'],
]

describe('non-motor coverage names localize (no raw English on the insights tab)', () => {
    for (const [raw, elExpected, enExpected] of cases) {
        it(`localizes "${raw}"`, () => {
            expect(localizeCoverageName(raw, elNames)).toBe(elExpected)
            expect(localizeCoverageName(raw, enNames)).toBe(enExpected)
        })
    }

    it('el and en coverage_names maps share the same keys', () => {
        expect(Object.keys(elNames).sort()).toEqual(Object.keys(enNames).sort())
    })
})
