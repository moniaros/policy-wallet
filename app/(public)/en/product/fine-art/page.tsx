import type { Metadata } from "next"
import PageClient from "../../../product/fine-art/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-fine-art", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/fine-art">
            <PageClient locale="en" />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-fine-art"])} />
        </StaticLanguageProvider>
    )
}
