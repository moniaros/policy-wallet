import type { Metadata } from "next"
import PageClient from "../../../product/group-life/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-group-life", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/group-life">
            <PageClient />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-group-life"])} />
        </StaticLanguageProvider>
    )
}
