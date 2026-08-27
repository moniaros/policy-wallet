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
// The deduction ladder, however the locals are named — and BOTH spellings:
// the arithmetic form the four copies used, and the weight-map form the
// canonical implementation itself uses (a fifth copy could arrive that way).
const LADDER_ARITHMETIC = /\*\s*25\s*\+[^)]*\*\s*15\s*\+[^)]*\*\s*8\s*\+[^)]*\*\s*3/
const LADDER_WEIGHT_MAP = /critical:\s*25\s*,\s*high:\s*15\s*,\s*medium:\s*8\s*,\s*low:\s*3/
const handRolledLadder = (code: string) =>
    LADDER_ARITHMETIC.test(code) || LADDER_WEIGHT_MAP.test(code)

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
            if (handRolledLadder(read(file))) {
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

/**
 * RED-PROOF (Phase 6 guard audit): the ladder matcher against the AUTHENTIC
 * hand-copied implementations (8f125fd5 deleted exactly these — dashboard,
 * digest, drip, onboarding spellings), the weight-map spelling, and
 * arithmetic that must stay silent.
 */
describe('the ladder matcher is proven on the authentic copies', () => {
    it('flags every spelling that shipped', () => {
        expect(handRolledLadder(
            'healthScore = Math.max(0, Math.min(100, 100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)))',
        )).toBe(true)
        expect(handRolledLadder(
            'const score = Math.max(0, Math.min(100, 100 - (c * 25 + h * 15 + m * 8 + l * 3)))',
        )).toBe(true)
        expect(handRolledLadder(
            'const weight: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3 }',
        )).toBe(true)
    })

    it('stays silent on unrelated arithmetic', () => {
        expect(handRolledLadder('const px = cols * 25 + gutter')).toBe(false)
        expect(handRolledLadder('const priorities = { critical: 4, high: 3, medium: 2, low: 1 }')).toBe(false)
    })
})
