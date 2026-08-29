import { describe, expect, it } from 'vitest'
import {
    CITATION_FIELDS,
    CITABLE_ARRAYS,
    arrayCitationKey,
    isCitableKey,
    sanitizeExtractionSources,
    CITATIONS_PROMPT_SECTION,
} from '@/lib/services/ai/extraction-citations'

/**
 * C3-0, HELD HALF — the extraction PROMPT and the SANITIZER.
 *
 * This is the money path. EXTRACTION_CITATIONS=1 is live in production, so
 * merging this changes the prompt every real extraction receives. Release
 * conditions are in docs/growth/HELD-extraction-citations.md.
 *
 * THESE TESTS ARE NECESSARY AND NOT SUFFICIENT. Their only evidence comes from
 * the mock provider, and the mock provider is how the July 2026 Gemini
 * schema-budget incident stayed invisible to CI and E2E while extraction was
 * dead in production. Do not read a green run here as evidence the change is
 * safe against a real provider.
 */

const SNIPPET = 'Ο ασφαλισμένος υποχρεούται να δηλώσει κάθε επίταση του κινδύνου εντός 14 ημερών.'

describe('the sanitizer keeps member citations and still drops junk', () => {
    it('keeps a well-formed member citation', () => {
        const out = sanitizeExtractionSources({ 'conditions[0]': { page: 7, snippet: SNIPPET } })
        expect(out).not.toBeNull()
        expect(out!['conditions[0]'].snippet).toBe(SNIPPET)
        expect(out!['conditions[0]'].page).toBe(7)
    })

    it('drops a member key for an array nobody declared citable', () => {
        expect(sanitizeExtractionSources({ 'beneficiaries[0]': { snippet: SNIPPET } })).toBeNull()
    })

    it('drops an entry with neither page nor snippet, as before', () => {
        expect(sanitizeExtractionSources({ 'conditions[0]': {} })).toBeNull()
    })
})


describe('the model is told about the keys, or it will never emit them', () => {
    it('the prompt names every citable array and shows the key shape', () => {
        for (const a of CITABLE_ARRAYS) expect(CITATIONS_PROMPT_SECTION).toContain(a)
        expect(CITATIONS_PROMPT_SECTION).toMatch(/name\[index\]/)
        expect(CITATIONS_PROMPT_SECTION).toMatch(/conditions\[0\]/)
    })

    it('and is still told never to invent a snippet', () => {
        expect(CITATIONS_PROMPT_SECTION).toMatch(/Never invent a snippet/)
    })
})


describe('PROBE — the old predicate is shown to drop exactly what this adds', () => {
    /** `sanitizeExtractionSources`'s membership test before C3-0, verbatim. */
    const oldPredicate = (field: string) => new Set<string>(CITATION_FIELDS).has(field)

    it('the old exact-membership test rejects every member key', () => {
        for (const a of CITABLE_ARRAYS) {
            const key = arrayCitationKey(a, 0)
            expect(oldPredicate(key), `${key} would have been dropped`).toBe(false)
            expect(isCitableKey(key), `${key} must now be kept`).toBe(true)
        }
    })

    it('so a condition citation could not have been stored at all', () => {
        // The concrete consequence: C3 had no evidence to read, for any policy,
        // however well the model cited. This is the finding C3-0 exists to fix.
        const dropped = Object.keys({ 'conditions[0]': { snippet: SNIPPET } }).filter(
            (k) => !oldPredicate(k)
        )
        expect(dropped).toEqual(['conditions[0]'])
    })

    it('and the scalar behaviour is untouched by the widening', () => {
        for (const f of CITATION_FIELDS) expect(oldPredicate(f)).toBe(isCitableKey(f))
    })
})
