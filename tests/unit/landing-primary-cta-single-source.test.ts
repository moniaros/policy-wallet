import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PRIMARY_ACTION } from '@/lib/marketing/positioning'

/**
 * The homepage must make ONE primary promise.
 *
 * The hero and the closing CTA both render PRIMARY_ACTION, but AudienceTabs —
 * a third signup button on the same page — had its own hard-coded label. When
 * PRIMARY_ACTION was reworded, that button kept the old text, so the page
 * showed two different promises at once and the stale one («Δείτε αν είστε
 * καλυμμένοι» / "See if you are covered") claimed a PolicyWallet Plus outcome
 * on a link that opens a FREE signup.
 *
 * Product pages are deliberately excluded: they run their own contextual CTAs
 * («Ξεκινήστε τον δωρεάν έλεγχο», «Ανεβάστε το συμβόλαιο κατοικίας»), which is
 * a ratified choice, not drift. The invariant here is narrow — anything under
 * components/landing that opens a signup speaks with the single source.
 */
/**
 * Recursive on purpose. The first version used a flat readdir — complete on
 * the day it was written only because components/landing happened to have no
 * subdirectories, and silently losing coverage the day one appeared. The
 * probe fixture below keeps that day red.
 */
function tsxFilesUnder(dir: string): string[] {
    let out: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) out = out.concat(tsxFilesUnder(full))
        else if (entry.name.endsWith('.tsx')) out.push(full)
    }
    return out
}

describe('landing signup CTAs come from one source', () => {
    const files = tsxFilesUnder('components/landing')

    it('scans a real component tree', () => {
        expect(files.length).toBeGreaterThan(5)
    })

    it('every landing component that links to signup reads PRIMARY_ACTION', () => {
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            if (!src.includes('/auth/signup')) continue
            expect.soft(src, `${file} links to signup without reading PRIMARY_ACTION`).toContain(
                'PRIMARY_ACTION'
            )
        }
    })

    it('no landing component hard-codes the current CTA text', () => {
        // Duplicating the literal is how the two drift apart again: the
        // constant gets reworded and the copy stays behind.
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            expect.soft(src, `${file} repeats PRIMARY_ACTION.el verbatim`).not.toContain(
                PRIMARY_ACTION.el
            )
            expect.soft(src, `${file} repeats PRIMARY_ACTION.en verbatim`).not.toContain(
                PRIMARY_ACTION.en
            )
        }
    })

    it('the retired wording is gone from the landing tree', () => {
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            expect.soft(src, `${file} still carries the retired CTA`).not.toMatch(
                /Δείτε αν είστε καλυμμένοι|See if you are covered/
            )
        }
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the collector recurses. Proven on a
 * committed fixture tree with one file at the top and one inside a
 * subdirectory — a return to the flat readdir loses the nested one and
 * fails here before it can silently shrink the live universe.
 */
describe('the collector is proven recursive', () => {
    it('finds files in subdirectories', () => {
        const found = tsxFilesUnder('tests/fixtures/guard-probes/landing-recursive').sort()
        expect(found).toEqual([
            join('tests/fixtures/guard-probes/landing-recursive', 'nested/deep.tsx'),
            join('tests/fixtures/guard-probes/landing-recursive', 'top.tsx'),
        ])
    })
})
