import type { Metadata } from "next"
import { MethodologySections } from "../../methodology/MethodologySections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("methodology", "en")

export default function MethodologyPageEnglish() {
    return (
        <>
            <MethodologySections locale="en" />
            <JsonLd data={[breadcrumbEnJsonLd(["methodology"])]} />
        </>
    )
}
