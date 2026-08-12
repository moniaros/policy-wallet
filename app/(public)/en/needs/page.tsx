import type { Metadata } from "next"
import { NeedsPageBody } from "../../needs/NeedsPageBody"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("needs", "en")

export default function NeedsPageEnglish() {
    return (
        <>
            <NeedsPageBody locale="en" />
            <JsonLd data={[breadcrumbEnJsonLd(["needs"])]} />
        </>
    )
}
