import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'
import { branchLabel, normalizeBranch, INSURANCE_BRANCHES } from '@/lib/insurance/taxonomy'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))

const CHILDREN = INSURANCE_BRANCHES.filter((b) => b.parentId).map((b) => b.id)

/**
 * The taxonomy has modelled child branches from the start — motorbike and truck
 * under motor, renters under home, income protection / disability / personal
 * accident under life, eleven business lines under business — with the comment
 * "child branches aggregate under their parent".
 *
 * Code that keys off `lineOfBusiness` directly does not see that, and the same
 * assumption has now produced four separate defects on this branch: an insured
 * motorbike accused of being uninsured at critical severity, a motorbike scoring
 * as no property cover at all, a motorbike commissioned at the default rate
 * instead of the agent's, and a motorbike showing no plate on the wallet list.
 *
 * This sweep is the pattern, not the instances.
 */
describe('the child branches the taxonomy declares', () => {
    it('are a real and non-trivial part of the vocabulary', () => {
        expect(CHILDREN).toContain('motorbike')
        expect(CHILDREN).toContain('truck')
        expect(CHILDREN).toContain('renters')
        expect(CHILDREN).toContain('income_protection')
        expect(CHILDREN.length).toBeGreaterThanOrEqual(15)
    })

    it('all resolve to a parent', () => {
        for (const id of CHILDREN) {
            expect(normalizeBranch(id).parentId, id).toBeTruthy()
        }
    })
})

/**
 * Every branch must have a label. Three components kept their own five-line map
 * and fell back to the raw id, so an agent saw "motorbike" where the taxonomy
 * already had «Μοτοσικλέτα».
 */
describe('every branch has a label, from one place', () => {
    it('labels every branch in both languages', () => {
        for (const branch of INSURANCE_BRANCHES) {
            for (const lang of ['el', 'en'] as const) {
                const label = branchLabel(branch.id, lang)
                expect(label, `${branch.id}/${lang}`).toBeTruthy()
                expect(label, `${branch.id}/${lang} fell back to the raw id`).not.toBe(branch.id)
            }
        }
    })

    it('no component keeps its own line-of-business label map', () => {
        const offenders = [...globSync('components/**/*.tsx'), ...globSync('app/**/*.tsx')].filter((f) =>
            /const LOB_LABELS\b/.test(read(f))
        )
        expect(offenders, `hand-kept LOB label maps:\n${offenders.join('\n')}`).toEqual([])
    })

    it('and none falls back to rendering the raw id', () => {
        // The defect is the FALLBACK, not the map's name — the first version of
        // this guard looked for `const LOB_LABELS` and passed happily when the
        // same map was inlined anonymously. What the agent actually saw was
        // "motorbike" where a label belonged, and that is what this catches.
        const offenders: string[] = []
        for (const f of [...globSync('components/**/*.tsx'), ...globSync('app/**/*.tsx')]) {
            const src = read(f)
            // `…[<something>.lineOfBusiness]…|| <same>.lineOfBusiness` — an index
            // into a label map with the raw id as the fallback.
            if (/\[[A-Za-z_.]*lineOfBusiness\][^\n]{0,60}\|\|[^\n]{0,40}lineOfBusiness/.test(src)) {
                offenders.push(f)
            }
        }
        expect(offenders, `raw line-of-business rendered as a label:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * The wallet list identifies a policy by what it insures — the plate for a
 * vehicle, the address for a home. Both were gated on an exact id match.
 */
describe('the wallet identifies what a child-branch policy insures', () => {
    it('resolves the family before choosing the card', () => {
        const src = read('app/(protected)/wallet/page.tsx')
        expect(src).toMatch(/const branch = normalizeBranch\(p\.lineOfBusiness\)/)
        expect(src).toMatch(/family === 'motor'/)
        expect(src).toMatch(/family === 'home'/)
        expect(src).not.toMatch(/p\.lineOfBusiness === 'motor'/)
        expect(src).not.toMatch(/p\.lineOfBusiness === 'home'/)
    })

    it('and a motorbike resolves to the motor family', () => {
        for (const id of ['motorbike', 'truck']) {
            const b = normalizeBranch(id)
            expect(b.parentId ?? b.id).toBe('motor')
        }
        const renters = normalizeBranch('renters')
        expect(renters.parentId ?? renters.id).toBe('home')
    })
})

/**
 * A second gap engine lived in lib/gap-detection — `detectGaps(policies)` —
 * referenced by nothing but its own test, emitting hardcoded English titles and
 * verdicts that disagreed with the real engine's.
 */
describe('there is one gap engine', () => {
    it('the prototype is gone', () => {
        const src = read('lib/gap-detection.ts')
        expect(src).not.toMatch(/export function detectGaps\(/)
        expect(src).not.toMatch(/Missing Health Insurance/)
        expect(src).not.toMatch(/Mock Logic/)
    })

    it('the real entry points are still there', () => {
        const src = read('lib/gap-detection.ts')
        expect(src).toMatch(/export async function detectGapsForPolicy/)
        expect(src).toMatch(/export async function detectGapsForUser/)
    })
})
