import { describe, expect, it } from 'vitest'
import { productCategories } from '@/lib/product/catalog'
import { getBranch, normalizeBranch } from '@/lib/insurance/taxonomy'

/**
 * G1 — the product catalog is a DISPLAY registry, not a second taxonomy.
 *
 * `lib/product/catalog.tsx` legitimately re-spells line names (marketing labels,
 * headlines, tag colours). What it must never become is a parallel list of
 * WHICH lines exist: every card joins to a real taxonomy branch by id, so a
 * renamed or removed branch fails here instead of leaving a ghost card, and a
 * new marketing card for a line the product does not write fails the same way.
 *
 * Labels are deliberately NOT asserted equal — «Αυτοκίνητο» (card) vs the
 * taxonomy label may diverge for good marketing reasons. Identity joins; prose
 * does not.
 */
describe('every product card joins the taxonomy by id', () => {
    it('the catalog is not empty and ids resolve — via the alias resolver, not raw equality', () => {
        // The catalog keys by ROUTE slug, and one slug is an alias, not an id:
        // /product/property is taxonomy branch `home` («property» is in its
        // aliases). normalizeBranch is the join, and this test proved it on its
        // first run by failing on exactly that card with getBranch alone.
        expect(productCategories.length).toBeGreaterThanOrEqual(15)
        for (const c of productCategories) {
            const branch = getBranch(c.id.replace(/-/g, '_')) ?? normalizeBranch(c.id)
            expect(branch, `catalog card "${c.id}" resolves to no taxonomy branch`).toBeTruthy()
            expect(branch.id, `"${c.id}" fell through to the catch-all branch`).not.toBe('other')
        }
    })

    it('hrefs are derived from the id, so a card cannot point at a foreign line', () => {
        for (const c of productCategories) {
            expect(c.href, `${c.id} href`).toMatch(new RegExp(`^/product/${c.id.replace(/_/g, '-')}$`))
        }
    })

    it('no duplicate ids — one card per line', () => {
        const ids = productCategories.map((c) => c.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
