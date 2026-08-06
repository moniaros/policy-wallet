import type { Metadata } from "next"
import { CompareSections } from "./CompareSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("compare")

export default function ComparePage() {
    return (
        <>
            <CompareSections locale="el" />
            <JsonLd data={[breadcrumbJsonLd(["compare"])]} />
        </>
    )
}
