import type { Metadata } from "next"
import PageClient from "../../../product/health/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-health", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/health">
            <PageClient />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-health"])} />
        </StaticLanguageProvider>
    )
}
