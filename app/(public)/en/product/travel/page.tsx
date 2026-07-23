import type { Metadata } from "next"
import PageClient from "../../../product/travel/PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-travel", "en")

export default function Page() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product/travel">
            <PageClient locale="en" />
            <JsonLd data={breadcrumbEnJsonLd(["product", "product-travel"])} />
        </StaticLanguageProvider>
    )
}
