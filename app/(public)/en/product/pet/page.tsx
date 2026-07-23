import type { Metadata } from "next"
import PageClient from "../../../product/pet/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-pet", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/pet">
            <PageClient locale="en" />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-pet"])} />
        </StaticLanguageProvider>
    )
}
