import { describe, it, expect } from 'vitest'
import { marketingPages } from '@/lib/seo/marketing-pages'
import { guides } from '@/lib/guides/content'

/**
 * SEO guardrails: rendered <title> (page title + " | PolicyWallet" template)
 * must stay ≤ 60 characters and meta descriptions inside 140–160 so snippets
 * never truncate. Guide entries must keep the AEO template invariants
 * (direct-answer summary, FAQ, cited sources).
 */

const TEMPLATE_SUFFIX = ' | PolicyWallet'
const MAX_TITLE = 60
const DESCRIPTION_RANGE: [number, number] = [140, 160]

describe('marketing page metadata', () => {
    for (const [key, page] of Object.entries(marketingPages)) {
        it(`${key}: title fits the 60-char rendered budget`, () => {
            expect(
                page.title.length + TEMPLATE_SUFFIX.length,
                `"${page.title}" renders at ${page.title.length + TEMPLATE_SUFFIX.length} chars`
            ).toBeLessThanOrEqual(MAX_TITLE)
        })

        it(`${key}: description is 140-160 chars`, () => {
            expect(page.description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0])
            expect(page.description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1])
        })

        if (page.en) {
            it(`${key}: EN title and description fit the same budgets`, () => {
                expect(page.en!.title.length + TEMPLATE_SUFFIX.length).toBeLessThanOrEqual(MAX_TITLE)
                expect(page.en!.description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0])
                expect(page.en!.description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1])
            })
        }
    }
})

describe('guide metadata + AEO template invariants', () => {
    for (const guide of guides) {
        for (const lang of ['el', 'en'] as const) {
            it(`${guide.slug}: ${lang} metaTitle fits the 60-char rendered budget`, () => {
                expect(
                    guide.metaTitle[lang].length + TEMPLATE_SUFFIX.length,
                    `"${guide.metaTitle[lang]}" renders at ${guide.metaTitle[lang].length + TEMPLATE_SUFFIX.length} chars`
                ).toBeLessThanOrEqual(MAX_TITLE)
            })

            it(`${guide.slug}: ${lang} metaDescription is 140-160 chars`, () => {
                expect(guide.metaDescription[lang].length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0])
                expect(guide.metaDescription[lang].length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1])
            })
        }

        it(`${guide.slug}: keeps the guide template shape`, () => {
            // Direct-answer summary in featured-snippet range (words, Greek).
            const summaryWords = guide.summary.el.split(/\s+/).filter(Boolean).length
            expect(summaryWords).toBeGreaterThanOrEqual(35)
            expect(summaryWords).toBeLessThanOrEqual(85)

            expect(guide.sections.length).toBeGreaterThanOrEqual(2)
            expect(guide.faq.length).toBeGreaterThanOrEqual(3)
            expect(guide.sources.length).toBeGreaterThanOrEqual(2)
            for (const source of guide.sources) {
                expect(source.url).toMatch(/^https:\/\//)
            }
            // Dates must be real ISO days; modified never precedes published.
            expect(guide.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(guide.dateModified >= guide.datePublished).toBe(true)
        })
    }
})
