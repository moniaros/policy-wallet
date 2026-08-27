import type { Metadata } from "next"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import GuidesIndexClient from "./GuidesIndexClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, guideIndexJsonLd } from "@/lib/seo/jsonld"
import { guides } from "@/lib/guides/content"
import { marketingPages } from "@/lib/seo/marketing-pages"

export const metadata: Metadata = buildMarketingMetadata("guides")

export default function GuidesPage() {
    return (
        <StaticLanguageProvider language="el" counterpartPath="/en/guides">
            <GuidesIndexClient />
            <JsonLd
                data={[
                    breadcrumbJsonLd(["guides"]),
                    // Mirrors what the page renders: same ordering, same
                    // summaries, same dates. Never a claim the page omits.
                    guideIndexJsonLd({
                        path: "/guides",
                        name: marketingPages.guides.title,
                        description: marketingPages.guides.description,
                        inLanguage: "el",
                        items: [...guides]
                            .sort((a, b) =>
                                (b.dateModified || b.datePublished).localeCompare(
                                    a.dateModified || a.datePublished,
                                ),
                            )
                            .map((guide) => ({
                                path: `/guides/${guide.slug}`,
                                headline: guide.title.el,
                                description: guide.summary.el,
                                datePublished: guide.datePublished,
                                dateModified: guide.dateModified,
                            })),
                    }),
                ]}
            />
        </StaticLanguageProvider>
    )
}
