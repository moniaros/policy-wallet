/**
 * /llms.txt lists what the sitemap lists (SEO review 2026-10 S3): every
 * marketing page, guide and glossary term, and the one entity sentence.
 */
import { describe, expect, it } from "vitest"
import { GET } from "@/app/llms.txt/route"
import { marketingPages } from "@/lib/seo/marketing-pages"
import { guides } from "@/lib/guides/content"
import { glossaryTerms } from "@/lib/glossary/content"
import { siteConfig } from "@/lib/seo/site"

describe("/llms.txt", async () => {
    const res = GET()
    const body = await res.text()
    const links = new Set([...body.matchAll(/\]\(https?:\/\/[^/)]+(\/[^)]*)\)/g)].map((m) => m[1]))

    it("is plain text and opens with the entity sentence", () => {
        expect(res.headers.get("content-type")).toMatch(/^text\/plain/)
        expect(body.startsWith("# PolicyWallet")).toBe(true)
        expect(body).toContain(siteConfig.definition.el)
    })

    it("links every marketing page, guide and glossary term", () => {
        const expected = [
            ...Object.values(marketingPages).map((p) => p.path),
            ...guides.map((g) => `/guides/${g.slug}`),
            ...glossaryTerms.map((t) => `/lexiko/${t.slug}`),
        ]
        expect(expected.filter((p) => !links.has(p))).toEqual([])
    })
})
