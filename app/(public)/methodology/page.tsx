import type { Metadata } from "next"
import { MethodologySections } from "./MethodologySections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("methodology")

export default function MethodologyPage() {
    return (
        <>
            <MethodologySections locale="el" />
            <JsonLd data={[breadcrumbJsonLd(["methodology"])]} />
        </>
    )
}
