import type { Metadata } from "next"
import PageClient from "./PageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product-fine-art")

export default function Page() {
    return (
        <>
            <PageClient locale="el" />
            <JsonLd data={breadcrumbJsonLd(["product", "product-fine-art"])} />
        </>
    )
}
