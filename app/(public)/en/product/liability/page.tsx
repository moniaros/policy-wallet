import type { Metadata } from "next"
import PageClient from "../../../product/liability/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-liability", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/liability">
            <PageClient />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-liability"])} />
        </StaticLanguageProvider>
    )
}
