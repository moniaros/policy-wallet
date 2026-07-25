import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { glossaryTerms, getGlossaryTerm } from '@/lib/glossary/content'
import { guides, getGuide } from '@/lib/guides/content'
import { resolvePolicyGlossaryHints } from '@/lib/glossary/hints'

/**
 * The public /lexiko glossary and /guides articles are the AEO/SEO surface — the
 * first insurance content a prospect (or an answer engine) sees. They cross-link
 * each other and the /product pages heavily. A cross-link to a term, guide or
 * product that no longer exists is a dead click and a professional-credibility
 * hit, and it rots silently as content is added and removed.
 *
 * This validates every internal /lexiko, /guides and /product link embedded in
 * the content datasets against the real set of targets, and that every in-product
 * glossary hint resolves to a real term.
 */
const glossarySlugs = new Set(glossaryTerms.map((t) => t.slug))
const guideSlugs = new Set(guides.map((g) => g.slug))
const productSlugs = new Set(
    readdirSync('app/(public)/product', { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name),
)

const CONTENT_FILES = ['lib/glossary/content.ts', 'lib/guides/content.ts']

// Pull every /lexiko|/guides|/product/<slug> reference out of the content source
// (covers structured `related` links AND any inline body links).
function collectLinks(): { file: string; kind: string; slug: string }[] {
    const out: { file: string; kind: string; slug: string }[] = []
    for (const file of CONTENT_FILES) {
        const src = readFileSync(file, 'utf-8')
        // Anchor on a leading quote so this matches href LITERALS ("/guides/x"),
        // not module import paths like "@/lib/guides/content".
        for (const m of src.matchAll(/['"`]\/(lexiko|guides|product)\/([a-z0-9-]+)/g)) {
            out.push({ file, kind: m[1], slug: m[2] })
        }
    }
    return out
}

describe('public content cross-links all resolve', () => {
    it('sanity: the datasets and targets loaded', () => {
        expect(glossarySlugs.size).toBeGreaterThanOrEqual(12)
        expect(guideSlugs.size).toBeGreaterThanOrEqual(5)
        expect(productSlugs.size).toBeGreaterThanOrEqual(10)
    })

    it('every /lexiko, /guides and /product link points at a real target', () => {
        const links = collectLinks()
        expect(links.length).toBeGreaterThan(15) // the graph is actually linked

        const broken: string[] = []
        for (const { file, kind, slug } of links) {
            const ok =
                kind === 'lexiko' ? glossarySlugs.has(slug)
                    : kind === 'guides' ? guideSlugs.has(slug)
                        : productSlugs.has(slug)
            if (!ok) broken.push(`${file}: /${kind}/${slug}`)
        }
        expect(broken, `dead internal content links:\n${broken.join('\n')}`).toEqual([])
    })

    it('every in-product glossary hint resolves to a real term (no dead hints)', () => {
        for (const lang of ['el', 'en'] as const) {
            const hints = resolvePolicyGlossaryHints(lang, {} as never)
            for (const [key, data] of Object.entries(hints)) {
                expect(data, `hint "${key}" (${lang}) resolves to no term`).not.toBeNull()
            }
        }
    })

    it('getGlossaryTerm / getGuide agree with the slug sets (lookup works)', () => {
        for (const slug of glossarySlugs) expect(getGlossaryTerm(slug)?.slug).toBe(slug)
        for (const slug of guideSlugs) expect(getGuide(slug)?.slug).toBe(slug)
    })
})
