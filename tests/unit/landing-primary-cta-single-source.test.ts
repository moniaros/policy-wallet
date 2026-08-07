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
describe('landing signup CTAs come from one source', () => {
    const dir = 'components/landing'
    const files = readdirSync(dir)
        .filter((name) => name.endsWith('.tsx'))
        .map((name) => join(dir, name))

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
