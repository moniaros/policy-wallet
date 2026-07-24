import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const GU = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏ'
// Final sigma (ς) MUST be here. Omitting it made the first casing sweep skip
// every value containing a word ending in ς — which in Greek is most genitives
// and masculine nominatives — leaving ~140 Title Case labels behind.
const GL = 'αβγδεζηθικλμνξοπρσςτυφχψωάέήίόύώϊϋΐΰ'
const isTitleCase = (w: string) => w.length >= 2 && GU.includes(w[0]) && [...w.slice(1)].every((c) => GL.includes(c))

/**
 * Greek uses sentence case, not English-style Title Case. Title Case on a Greek
 * UI label is the unmistakable tell of machine translation. The LOB/branch
 * taxonomy is exempt — those are double-quoted product-category names that are
 * market-standard Title Case in Greek insurance.
 */
describe('Greek UI labels use sentence case', () => {
    it('has no Title Case single-quoted labels left', () => {
        const src = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
        const offenders: string[] = []
        for (const m of src.matchAll(/(\w+):\s*'([^']{3,60})'/g)) {
            const [, key, val] = m
            if (/[.;!?,·:0-9A-Za-z/()→]/.test(val)) continue
            const words = val.split(' ')
            if (words.length < 2 || words.length > 4) continue
            if (!isTitleCase(words[0])) continue
            if (words.filter(isTitleCase).length >= 2) offenders.push(`${key}: ${val}`)
        }
        expect(offenders, `Title Case Greek labels:\n${offenders.join('\n')}`).toEqual([])
    })

    it('keeps final sigma in the lowercase set (the bug that hid 140 labels)', () => {
        expect(GL).toContain('ς')
    })
})
