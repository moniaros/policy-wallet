import { getSiteOrigin, siteConfig } from "@/lib/seo/site"
import { enPathFor, marketingPages } from "@/lib/seo/marketing-pages"
import { guides } from "@/lib/guides/content"
import { glossaryTerms } from "@/lib/glossary/content"

/**
 * /llms.txt (llmstxt.org): the map AI engines read before answering about us.
 * Built from the SAME registries as app/sitemap.ts, so it cannot list a page
 * that does not exist or miss one that does (SEO review 2026-10 S3). The
 * entity sentence is siteConfig.definition — the one JSON-LD also carries.
 */
export const dynamic = "force-static"

const LEGAL = new Set(["privacy", "terms", "cookies", "subprocessors"])

export function GET() {
    const origin = getSiteOrigin()
    const link = (title: string, path: string, note?: string) =>
        `- [${title}](${origin}${path})${note ? `: ${note}` : ""}`
    const pages = Object.entries(marketingPages)

    const lines = [
        "# PolicyWallet",
        "",
        `> ${siteConfig.definition.el}`,
        "",
        `> ${siteConfig.definition.en}`,
        "",
        "Greek is the primary language; pages with an English version are listed under «English».",
        "",
        "## Σελίδες",
        link("Αρχική", "/", siteConfig.description.el),
        ...pages
            .filter(([key, p]) => !LEGAL.has(key) && !p.path.startsWith("/product/"))
            .map(([, p]) => link(p.breadcrumb, p.path, p.description)),
        "",
        "## Κλάδοι ασφάλισης",
        ...pages.filter(([, p]) => p.path.startsWith("/product/")).map(([, p]) => link(p.breadcrumb, p.path, p.description)),
        "",
        "## Οδηγοί",
        ...guides.map((g) => link(g.title.el, `/guides/${g.slug}`, g.metaDescription.el)),
        "",
        "## Λεξικό",
        ...glossaryTerms.map((t) => link(t.term.el, `/lexiko/${t.slug}`, t.metaDescription.el)),
        "",
        "## English",
        link("Home", "/en", siteConfig.description.en),
        ...pages.filter(([, p]) => p.en).map(([, p]) => link(p.en!.title, enPathFor(p.path), p.en!.description)),
        "",
        "## Optional",
        ...pages.filter(([key]) => LEGAL.has(key)).map(([, p]) => link(p.breadcrumb, p.path)),
        "",
    ]

    return new Response(lines.join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
}
