import type { Metadata } from "next"
import GuidesIndexClient from "../../guides/GuidesIndexClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("guides", "en")

export default function GuidesPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/guides">
            <GuidesIndexClient />
            <JsonLd data={breadcrumbEnJsonLd(["guides"])} />
        </StaticLanguageProvider>
    )
}
