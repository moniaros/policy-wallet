/**
 * The homepage's four defined terms are SHORT FORMS of glossary entries, not
 * a second registry. The join below is what keeps that true: every
 * `glossarySlug` must resolve in lib/glossary/content.ts, so a renamed or
 * deleted glossary entry fails here instead of leaving the answer block
 * linking to a 404 — and nobody can quietly grow marketing-side definitions
 * that the glossary does not back.
 *
 * Probe: proven red by pointing a glossarySlug at "no-such-term".
 */
import { describe, expect, it } from "vitest"
import { DEFINED_TERMS } from "@/lib/marketing/defined-terms"
import { glossaryTerms } from "@/lib/glossary/content"

describe("defined terms join the glossary", () => {
    const slugs = new Set(glossaryTerms.map((t) => t.slug))

    it("every homepage defined term resolves to a glossary entry", () => {
        const orphans = DEFINED_TERMS.filter((t) => !slugs.has(t.glossarySlug)).map(
            (t) => `${t.id} -> ${t.glossarySlug}`
        )
        expect(orphans, `defined terms pointing at no glossary entry:\n  ${orphans.join("\n  ")}`).toEqual([])
    })

    it("the four load-bearing terms are all present", () => {
        // Floor, not a cap: the answer block promises exactly these four.
        for (const slug of ["kalypsi", "exairesi", "apallagi", "chronos-anamonis"]) {
            expect(slugs.has(slug), `glossary lost "${slug}"`).toBe(true)
        }
    })
})
