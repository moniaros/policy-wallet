import { describe, it, expect } from 'vitest'
import { localizeCoverageName, normalizeCoverageKey } from '@/lib/i18n/text-format'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const elNames = el.coverage_names as Record<string, string>
const enNames = en.coverage_names as Record<string, string>

/**
 * `localizeCoverageName` normalises case, spaces and separators before matching.
 * It cannot see past a transposed letter — and the key for the most valuable
 * cover on a comprehensive motor policy was spelled 'OWN DAMANGE'.
 *
 * Nothing feeds this vocabulary to the model; it reads the document and emits
 * whatever the wording says, which for this cover is 'OWN DAMAGE'. So the lookup
 * missed and the fallback fired: a Greek policyholder saw «Κλοπή», «Θραύση
 * κρυστάλλων» and then raw English "OWN DAMAGE" in the middle of their coverage
 * list.
 */
describe('coverage names resolve for the spellings a document actually yields', () => {
    it('own damage, spelled correctly', () => {
        expect(localizeCoverageName('OWN DAMAGE', elNames)).toBe('Ιδίες ζημιές (μικτή)')
        expect(localizeCoverageName('Own Damage', elNames)).toBe('Ιδίες ζημιές (μικτή)')
        expect(localizeCoverageName('own_damage', elNames)).toBe('Ιδίες ζημιές (μικτή)')
    })

    it('still resolves the historic misspelling, for rows already stored under it', () => {
        expect(localizeCoverageName('OWN DAMANGE', elNames)).toBe('Ιδίες ζημιές (μικτή)')
    })

    it('resolves the alternate renderings of covers already in the table', () => {
        expect(localizeCoverageName('THIRD PARTY LIABILITY', elNames)).toMatch(/Αστική ευθύνη/)
        expect(localizeCoverageName('CIVIL LIABILITY', elNames)).toMatch(/Αστική ευθύνη/)
        expect(localizeCoverageName('WINDSCREEN', elNames)).toBe('Θραύση κρυστάλλων')
        expect(localizeCoverageName('Windshield', elNames)).toBe('Θραύση κρυστάλλων')
        expect(localizeCoverageName('ROAD ASSISTANCE', elNames)).toBe('Οδική βοήθεια')
    })

    it('falls back to the raw string only for genuinely unknown covers', () => {
        expect(localizeCoverageName('SOMETHING NOBODY SELLS', elNames)).toBe('SOMETHING NOBODY SELLS')
    })

    it('every key resolves in both languages — no half-translated cover', () => {
        for (const key of Object.keys(elNames)) {
            expect(enNames[key], `en is missing "${key}"`).toBeTruthy()
        }
        for (const key of Object.keys(enNames)) {
            expect(elNames[key], `el is missing "${key}"`).toBeTruthy()
        }
    })

    it('no two keys normalise to the same lookup', () => {
        const seen = new Map<string, string>()
        for (const key of Object.keys(elNames)) {
            const norm = normalizeCoverageKey(key)
            const prior = seen.get(norm)
            // Aliases are fine when they agree; a collision that disagrees means
            // one of them silently wins depending on object order.
            if (prior) expect(elNames[key], `"${prior}" vs "${key}"`).toBe(elNames[prior])
            seen.set(norm, key)
        }
    })
})

/**
 * The Greek table mixed casings for the same concept on adjacent lines —
 * «Φυσικά Φαινόμενα / Πλημμύρα» beside «Φυσικά φαινόμενα».
 */
describe('the Greek coverage table is internally consistent', () => {
    it('does not render one concept two ways', () => {
        expect(elNames['NATURAL PHENOMENA / FLOOD']).toBe('Φυσικά φαινόμενα / Πλημμύρα')
        expect(elNames['NATURAL PHENOMENA']).toBe('Φυσικά φαινόμενα')
    })

    it('keeps the market-standard capitalisation of the first word only', () => {
        const offenders = Object.entries(elNames)
            .filter(([, v]) => /^[Α-ΩΆΈΉΊΌΎΏ]/.test(v))
            .filter(([, v]) => {
                const words = v.split(' ').slice(1)
                // A word after a slash legitimately re-capitalises.
                return words.some((w, i) => /^[Α-ΩΆΈΉΊΌΎΏ]/.test(w) && words[i - 1] !== '/')
            })
            .map(([k, v]) => `${k}: ${v}`)
        expect(offenders, `mixed casing:\n${offenders.join('\n')}`).toEqual([])
    })
})
