import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { provisionalProtectionScore } from '@/lib/services/gap-engine/protection-score'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))

/**
 * The product's headline metric had FIVE implementations: the gap engine's
 * category-weighted `calculateProtectionScore`, and four hand-copied instances
 * of `100 - (critical*25 + high*15 + medium*8 + low*3)` in the dashboard, the
 * weekly digest, the engagement drip and onboarding.
 *
 * The four copies agreed with each other and disagreed with the real score by
 * construction — they measure different things. A single motor policy with no
 * gaps scores 100 under the estimate and can score far lower under the category
 * model, because holding one line of cover is not the same as being protected.
 * So the same portfolio read one number in the Monday email and another on the
 * dashboard, with nothing to explain the difference.
 */
describe('one provisional score, computed in one place', () => {
    it('is not reimplemented anywhere', () => {
        const offenders: string[] = []
        const files = [
            ...globSync('lib/**/*.ts'),
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('components/**/*.tsx'),
        ].filter((f) => !f.endsWith('gap-engine/protection-score.ts'))
        for (const file of files) {
            // the deduction ladder, however the locals are named
            if (/\*\s*25\s*\+[^)]*\*\s*15\s*\+[^)]*\*\s*8\s*\+[^)]*\*\s*3/.test(read(file))) {
                offenders.push(file)
            }
        }
        expect(offenders, `hand-rolled protection score in:\n${offenders.join('\n')}`).toEqual([])
    })

    it('returns nothing to score rather than a score of nothing', () => {
        expect(provisionalProtectionScore(0, [])).toBeNull()
        expect(provisionalProtectionScore(0, ['critical'])).toBeNull()
    })

    it('keeps the deduction ladder the four copies agreed on', () => {
        expect(provisionalProtectionScore(1, [])).toBe(100)
        expect(provisionalProtectionScore(1, ['critical'])).toBe(75)
        expect(provisionalProtectionScore(1, ['high'])).toBe(85)
        expect(provisionalProtectionScore(1, ['medium'])).toBe(92)
        expect(provisionalProtectionScore(1, ['low'])).toBe(97)
    })

    it('floors at zero and ignores unknown severities', () => {
        expect(provisionalProtectionScore(1, Array(9).fill('critical'))).toBe(0)
        expect(provisionalProtectionScore(1, ['made-up'])).toBe(100)
    })
})

/**
 * No surface renders the estimate any more. The describe block that stood
 * here required every rendering surface (digest, drip, onboarding, dashboard)
 * to label the figure "provisional"; all four renders were removed with the
 * protection score itself in Aug 2026 (PW-MOBILE-TRANSFORM-01, halt H-001).
 * tests/unit/score-containment.test.ts now asserts the stronger thing — the
 * value renders NOWHERE — while the arithmetic above stays single-source for
 * the non-rendering consumers that survive it.
 */
