import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { COMPARISON_ROWS, DIFFERENTIATORS } from '@/lib/marketing/positioning'

const SRC = readFileSync('components/landing/WhyDifferent.tsx', 'utf-8')

/**
 * The homepage shows two of the five comparison rows, chosen deliberately and
 * addressed by index. An index list is only safe if something notices when the
 * source array moves underneath it, which is what this file is for.
 *
 * PW-CONTENT-02 A5 (2026-10-21): the sixth row, «Δεν κερδίζει τίποτα από την
 * απάντηση» / "Earns nothing from the answer it gives", was the argument the
 * excerpt used to end on. It marked the agent «Όχι» while the same site sells to
 * agents, and it is deleted with no replacement. The excerpt now ends on a row the
 * product delivers on every plan.
 */
const EXPECTED = [
    'Helps you find what is excluded',
    'Finds possible shared cover',
]

describe('the homepage comparison excerpt', () => {
    const indices = [...SRC.matchAll(/HOMEPAGE_ROW_INDICES = \[([^\]]*)\]/g)]
        .flatMap((m) => m[1].split(',').map((n) => Number(n.trim())))
        .filter((n) => Number.isInteger(n))

    it('addresses two rows', () => {
        expect(indices).toHaveLength(2)
    })

    it('the deleted row stays deleted (A5)', () => {
        expect(COMPARISON_ROWS.map((r) => r.job.en)).not.toContain('Earns nothing from the answer it gives')
        expect(COMPARISON_ROWS.map((r) => r.job.el)).not.toContain('Δεν κερδίζει τίποτα από την απάντηση')
    })

    it('still points at the rows it was chosen for', () => {
        expect(indices.map((i) => COMPARISON_ROWS[i]?.job.en)).toEqual(EXPECTED)
    })

    it('every excerpt row is one the product delivers on every plan (no «with Family» cell on the homepage)', () => {
        for (const i of indices) expect(COMPARISON_ROWS[i].policywallet).toBe('yes')
    })

    it('keeps every differentiator claim — they exist nowhere else on the site', () => {
        for (const item of DIFFERENTIATORS) {
            expect(SRC).toMatch(/DIFFERENTIATORS\.map/)
        }
        expect(DIFFERENTIATORS.length).toBeGreaterThanOrEqual(3)
    })

    it('renders the wide table through the stacked-table primitive', () => {
        // Without it the four columns become a horizontal scroller on a phone
        // and the PolicyWallet column — the whole point — falls off screen.
        expect(SRC).toMatch(/pw-stacked-table/)
        expect(SRC).toMatch(/data-label=/)
    })

    it('does not reintroduce the eyebrow the craft floor bans', () => {
        expect(SRC).not.toMatch(/uppercase tracking-widest/)
    })

    it('does not put the stacked rows inside a second card', () => {
        // Below 1024px `.pw-stacked-table tbody tr` is itself `rounded-2xl
        // border p-4`. An unprefixed wrapper card here renders cards inside a
        // card on every phone — caught in a screenshot, not by any linter.
        const wrapper = SRC.match(/<div className="([^"]*)">\s*<table/)?.[1] ?? ''
        expect(wrapper).not.toBe('')
        for (const chrome of ['rounded', 'border', 'bg-', 'p-']) {
            const unprefixed = wrapper
                .split(/\s+/)
                .filter((c) => c.includes(chrome) && !c.startsWith('lg:'))
            expect(unprefixed, `card chrome active below lg: ${unprefixed.join(' ')}`).toEqual([])
        }
    })

    it('shares one verdict implementation with /compare', () => {
        expect(SRC).toMatch(/from "@\/components\/landing\/ComparisonVerdict"/)
        const compare = readFileSync('app/(public)/compare/CompareSections.tsx', 'utf-8')
        expect(compare).toMatch(/from "@\/components\/landing\/ComparisonVerdict"/)
        // Neither surface may hold a second copy of the palette.
        expect(compare).not.toMatch(/const VERDICT_TONE/)
        expect(SRC).not.toMatch(/const VERDICT_TONE/)
    })
})
