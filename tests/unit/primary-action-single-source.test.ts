import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { globSync } from '../helpers/glob'
import { PRIMARY_ACTION, PRIMARY_ACTION_SHORT } from '@/lib/marketing/positioning'
import { PRIMARY_CTA } from '@/lib/nav/public-nav'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * One action, two sanctioned wordings, no third.
 *
 * Three different strings used to send a visitor to the same policyholder
 * signup: «Δείτε πού είστε» in the sitewide header, «Δείτε τι λέει το
 * συμβόλαιό σας» in the hero, and «Ξεκινήστε τον δωρεάν έλεγχο» hardcoded on
 * all fifteen branch pages plus /product. Someone who tapped one could not tell
 * it was the button they had just decided against on the previous screen.
 *
 * The short header form is NOT laziness and must not be "fixed" by pointing the
 * header at the long form: with the full wording in the fixed-width header, at
 * 1024px the logo overlapped the first nav item and the button wrapped out of
 * the bar. Both forms therefore live together in positioning.ts, and this test
 * stops a fourth from appearing anywhere else.
 */

/** The retired wordings. A public surface may not reintroduce them. */
const RETIRED = [
    'Ξεκινήστε τον δωρεάν έλεγχο',
    'Start your free check',
]

describe('the policyholder signup CTA has one source', () => {
    const files = [
        ...globSync('app/(public)/**/*.tsx'),
        ...globSync('components/landing/**/*.tsx'),
        ...globSync('components/public/**/*.tsx'),
    ]

    it('there are public surfaces to check', () => {
        expect(files.length).toBeGreaterThan(20)
    })

    it('no public surface hardcodes a retired signup label', () => {
        const offenders: string[] = []
        for (const file of files) {
            const src = strip(readFileSync(file, 'utf-8'))
            for (const literal of RETIRED) {
                if (src.includes(literal)) offenders.push(`${file} → «${literal}»`)
            }
        }
        expect(offenders, `hardcoded signup labels:\n${offenders.join('\n')}`).toEqual([])
    })

    it('no public surface rewrites the canonical wording as a literal', () => {
        // Reading the constant is correct; retyping its text is how the copy
        // drifted in the first place.
        const offenders: string[] = []
        for (const file of files) {
            if (file.endsWith('lib/marketing/positioning.ts')) continue
            const src = strip(readFileSync(file, 'utf-8'))
            for (const value of [PRIMARY_ACTION.el, PRIMARY_ACTION.en, PRIMARY_ACTION_SHORT.el, PRIMARY_ACTION_SHORT.en]) {
                if (src.includes(value)) offenders.push(`${file} → «${value}»`)
            }
        }
        expect(offenders, `retyped CTA copy:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the sitewide header CTA reads the short form from positioning', () => {
        expect(PRIMARY_CTA.label).toBe(PRIMARY_ACTION_SHORT)
        const nav = strip(readFileSync('lib/nav/public-nav.ts', 'utf-8'))
        expect(nav).toMatch(/PRIMARY_ACTION_SHORT/)
        expect(nav).not.toMatch(/Δείτε πού είστε/)
    })

    it('both forms are real in both languages and mean the same action', () => {
        for (const form of [PRIMARY_ACTION, PRIMARY_ACTION_SHORT]) {
            expect(form.el).toMatch(/[Α-Ωα-ωίϊΐόάέύϋΰήώ]/)
            expect(form.en.length).toBeGreaterThan(3)
        }
        // The short form has to actually be shorter, or it has no reason to exist.
        expect(PRIMARY_ACTION_SHORT.el.length).toBeLessThan(PRIMARY_ACTION.el.length)
        expect(PRIMARY_ACTION_SHORT.en.length).toBeLessThan(PRIMARY_ACTION.en.length)
    })
})

/**
 * The agent signup is a DIFFERENT action for a different audience, so it is
 * deliberately not unified with PRIMARY_ACTION. Pinned so a future tidy-up does
 * not "fix" the inconsistency by telling an insurance broker to see what their
 * policy says.
 */
describe('the agent signup CTA stays distinct', () => {
    it('does not use the policyholder action', () => {
        const src = readFileSync('app/(public)/solutions/agents/AgentsSolutionPageClient.tsx', 'utf-8')
        expect(src).toMatch(/role=agent/)
        expect(src).not.toMatch(/PRIMARY_ACTION\b/)
    })
})
