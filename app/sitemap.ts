import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/seo/site"
import { marketingPages } from "@/lib/seo/marketing-pages"
import { guides } from "@/lib/guides/content"

export default function sitemap(): MetadataRoute.Sitemap {
    const origin = getSiteOrigin()
    const lastModified = new Date()

    const entries: MetadataRoute.Sitemap = [
        {
            url: origin,
            lastModified,
            changeFrequency: "weekly",
            priority: 1,
            alternates: {
                languages: {
                    el: origin,
                    en: `${origin}/en`,
                },
            },
        },
        {
            url: `${origin}/en`,
            lastModified,
            changeFrequency: "weekly",
            priority: 0.9,
            alternates: {
                languages: {
                    el: origin,
                    en: `${origin}/en`,
                },
            },
        },
    ]

    const priorityByKey: Partial<Record<keyof typeof marketingPages, number>> = {
        product: 0.9,
        pricing: 0.9,
        "solutions-agents": 0.8,
        "for-agents": 0.7,
        guides: 0.7,
        company: 0.6,
        contact: 0.6,
        privacy: 0.3,
        terms: 0.3,
    }

    for (const [key, page] of Object.entries(marketingPages)) {
        entries.push({
            url: `${origin}${page.path}`,
            lastModified,
            changeFrequency: key === "guides" ? "weekly" : "monthly",
            priority:
                priorityByKey[key as keyof typeof marketingPages] ??
                (page.path.startsWith("/product/") ? 0.8 : 0.6),
        })
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
