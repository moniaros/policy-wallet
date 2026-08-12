import type { Metadata } from "next"
import GuidesIndexClient from "../../guides/GuidesIndexClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd, guideIndexJsonLd } from "@/lib/seo/jsonld"
import { guides } from "@/lib/guides/content"
import { marketingPages } from "@/lib/seo/marketing-pages"

export const metadata: Metadata = buildMarketingMetadata("guides", "en")

export default function GuidesPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/guides">
            <GuidesIndexClient />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["guides"]),
                    guideIndexJsonLd({
                        path: "/en/guides",
                        name: marketingPages.guides.en!.title,
                        description: marketingPages.guides.en!.description,
                        inLanguage: "en",
                        items: [...guides]
                            .sort((a, b) =>
                                (b.dateModified || b.datePublished).localeCompare(
                                    a.dateModified || a.datePublished,
                                ),
                            )
                            .map((guide) => ({
                                path: `/en/guides/${guide.slug}`,
                                headline: guide.title.en,
                                description: guide.summary.en,
                                datePublished: guide.datePublished,
                                dateModified: guide.dateModified,
                            })),
                    }),
                ]}
            />
        </StaticLanguageProvider>
    )
}
