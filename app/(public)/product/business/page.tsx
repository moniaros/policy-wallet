import type { Metadata } from "next"
import PageClient from "./PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-business")

export default function Page() {
    return (
        <>
            <PageClient />
            <JsonLd data={breadcrumbJsonLd(["product", "product-business"])} />
        </>
    )
}
