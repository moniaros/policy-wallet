import type { Metadata } from "next"
import PageClient from "../../../product/pension/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-pension", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/pension">
            <PageClient />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-pension"])} />
        </StaticLanguageProvider>
    )
}
