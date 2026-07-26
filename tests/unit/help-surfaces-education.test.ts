import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { guides, getGuideSummaries } from '@/lib/guides/content'

/**
 * The insurance guides and the /lexiko dictionary were public SEO content only —
 * a logged-in policyholder looking for help never met them. They are now
 * surfaced in the in-product help center: guides as first-class, searchable
 * cards under an "insurance basics" category, and the dictionary as a card.
 *
 * The guides module is ~60KB; it must stay OFF the client bundle. page.tsx (a
 * server component) resolves a COMPACT summary and passes it to the client —
 * these tests pin both the coverage and that boundary.
 */
describe('help center surfaces every guide as a searchable card', () => {
    it('getGuideSummaries covers every guide, compactly (no bodies/faq/sources)', () => {
        const summaries = getGuideSummaries()
        expect(summaries.length).toBe(guides.length)
        expect(summaries.length).toBeGreaterThan(0)
        for (const s of summaries) {
            expect(Object.keys(s).sort()).toEqual(['readingMinutes', 'slug', 'summary', 'title'])
            expect(s.title.el.length).toBeGreaterThan(0)
            expect(s.title.en.length).toBeGreaterThan(0)
            expect(s.summary.el.length).toBeGreaterThan(0)
        }
        // Every summary slug maps to a real guide route (/guides/<slug>).
        const realSlugs = new Set(guides.map((g) => g.slug))
        for (const s of summaries) expect(realSlugs.has(s.slug), s.slug).toBe(true)
    })

    it('the server shell resolves summaries and hands them to the client', () => {
        const page = readFileSync('app/(protected)/help/page.tsx', 'utf-8')
        expect(page).toMatch(/getGuideSummaries\(\)/)
        expect(page).toMatch(/<HelpClient guideSummaries=/)
        // page.tsx must NOT be a client component — that would bundle the guides.
        expect(page).not.toMatch(/["']use client["']/)
    })

    it('the client lists guides under "insurance basics", linking to /guides/<slug>', () => {
        const client = readFileSync('app/(protected)/help/HelpClient.tsx', 'utf-8')
        expect(client).toMatch(/categoryKey: 'insuranceBasics'/)
        expect(client).toMatch(/href: `\/guides\/\$\{g\.slug\}`/)
        // Guides join the searchable article list, not a separate silo.
        expect(client).toMatch(/\[\.\.\.helpCards, \.\.\.guideCards\]/)
        // The dictionary is surfaced with a link to the live /lexiko route.
        expect(client).toMatch(/router\.push\('\/lexiko'\)/)
        // The heavy module's VALUES must never be imported into the client
        // component — only the erased type. A value import (e.g.
        // getGuideSummaries/guides) would bundle the ~60KB module.
        expect(client).not.toMatch(/import \{[^}]*getGuideSummaries/)
        expect(client).not.toMatch(/import \{[^}]*\bguides\b/)
        expect(client).toMatch(/import type \{ GuideSummary \} from '@\/lib\/guides\/content'/)
    })
})
