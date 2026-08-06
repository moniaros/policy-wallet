import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/seo/site"
import { enPathFor, marketingPages } from "@/lib/seo/marketing-pages"
import { guides } from "@/lib/guides/content"
import { glossaryTerms } from "@/lib/glossary/content"

export default function sitemap(): MetadataRoute.Sitemap {
    const origin = getSiteOrigin()

    // Static marketing pages carry NO lastModified: stamping them with the
    // request time claimed every page changed at crawl moment, which teaches
    // crawlers to distrust the field. Guides and glossary entries keep their
    // real dateModified below.
    const homeLanguages = {
        el: origin,
        en: `${origin}/en`,
        "x-default": origin,
    }
    const entries: MetadataRoute.Sitemap = [
        {
            url: origin,
            changeFrequency: "weekly",
            priority: 1,
            alternates: { languages: homeLanguages },
        },
        {
            url: `${origin}/en`,
            changeFrequency: "weekly",
            priority: 0.9,
            alternates: { languages: homeLanguages },
        },
    ]

    const priorityByKey: Partial<Record<keyof typeof marketingPages, number>> = {
        product: 0.9,
        pricing: 0.9,
        // Linked from the homepage and the footer — a first-class landing page.
        compare: 0.8,
        "solutions-agents": 0.8,
        guides: 0.7,
        lexiko: 0.7,
        company: 0.6,
        contact: 0.6,
        privacy: 0.3,
        terms: 0.3,
        cookies: 0.3,
        subprocessors: 0.3,
    }

    for (const [key, page] of Object.entries(marketingPages)) {
        const priority =
            priorityByKey[key as keyof typeof marketingPages] ??
            (page.path.startsWith("/product/") ? 0.8 : 0.6)
        // Pages with a real English route pair get hreflang alternates and a
        // sitemap entry for the /en variant; the rest self-reference Greek.
        const languages = page.en
            ? {
                  el: `${origin}${page.path}`,
                  en: `${origin}${enPathFor(page.path)}`,
                  "x-default": `${origin}${page.path}`,
              }
            : undefined

        entries.push({
            url: `${origin}${page.path}`,
            changeFrequency: key === "guides" ? "weekly" : "monthly",
            priority,
            ...(languages ? { alternates: { languages } } : {}),
        })
        if (page.en) {
            entries.push({
                url: `${origin}${enPathFor(page.path)}`,
                changeFrequency: "monthly",
                // Rounded: raw float math emitted "0.7000000000000001".
                priority: Math.round(Math.max(priority - 0.1, 0.1) * 10) / 10,
                alternates: { languages: languages! },
            })
        }
    }

    for (const guide of guides) {
        const guideUrl = `${origin}/guides/${guide.slug}`
        const guideEnUrl = `${origin}/en/guides/${guide.slug}`
        // Guide articles are fully bilingual: every /guides/<slug> has a real
        // /en/guides/<slug> mirror, so each entry carries the hreflang pair.
        const guideLanguages = {
            el: guideUrl,
            en: guideEnUrl,
            "x-default": guideUrl,
        }
        entries.push({
            url: guideUrl,
            lastModified: new Date(guide.dateModified),
            changeFrequency: "monthly",
            priority: 0.7,
            alternates: { languages: guideLanguages },
        })
        entries.push({
            url: guideEnUrl,
            lastModified: new Date(guide.dateModified),
            changeFrequency: "monthly",
            priority: 0.6,
            alternates: { languages: guideLanguages },
        })
    }

    for (const entry of glossaryTerms) {
        const termUrl = `${origin}/lexiko/${entry.slug}`
        const termEnUrl = `${origin}/en/lexiko/${entry.slug}`
        // Glossary terms are fully bilingual: every /lexiko/<slug> has a real
        // /en/lexiko/<slug> mirror, so each entry carries the hreflang pair.
        const termLanguages = {
            el: termUrl,
            en: termEnUrl,
            "x-default": termUrl,
        }
        entries.push({
            url: termUrl,
            lastModified: new Date(entry.dateModified),
            changeFrequency: "monthly",
            priority: 0.6,
            alternates: { languages: termLanguages },
        })
        entries.push({
            url: termEnUrl,
            lastModified: new Date(entry.dateModified),
            changeFrequency: "monthly",
            priority: 0.5,
            alternates: { languages: termLanguages },
        })
    }

    return entries
}
