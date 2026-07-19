import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/seo/site"
import { enPathFor, marketingPages } from "@/lib/seo/marketing-pages"
import { guides } from "@/lib/guides/content"

export default function sitemap(): MetadataRoute.Sitemap {
    const origin = getSiteOrigin()
    const lastModified = new Date()

    const homeLanguages = {
        el: origin,
        en: `${origin}/en`,
        "x-default": origin,
    }
    const entries: MetadataRoute.Sitemap = [
        {
            url: origin,
            lastModified,
            changeFrequency: "weekly",
            priority: 1,
            alternates: { languages: homeLanguages },
        },
        {
            url: `${origin}/en`,
            lastModified,
            changeFrequency: "weekly",
            priority: 0.9,
            alternates: { languages: homeLanguages },
        },
    ]

    const priorityByKey: Partial<Record<keyof typeof marketingPages, number>> = {
        product: 0.9,
        pricing: 0.9,
        "solutions-agents": 0.8,
        guides: 0.7,
        company: 0.6,
        contact: 0.6,
        privacy: 0.3,
        terms: 0.3,
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
            lastModified,
            changeFrequency: key === "guides" ? "weekly" : "monthly",
            priority,
            ...(languages ? { alternates: { languages } } : {}),
        })
        if (page.en) {
            entries.push({
                url: `${origin}${enPathFor(page.path)}`,
                lastModified,
                changeFrequency: "monthly",
                priority: Math.max(priority - 0.1, 0.1),
                alternates: { languages: languages! },
            })
        }
    }

    for (const guide of guides) {
        entries.push({
            url: `${origin}/guides/${guide.slug}`,
            lastModified: new Date(guide.dateModified),
            changeFrequency: "monthly",
            priority: 0.7,
        })
    }

    return entries
}
