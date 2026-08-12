import type { Metadata } from "next"
import { NeedsPageBody } from "./NeedsPageBody"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("needs")

export default function NeedsPage() {
    return (
        <>
            <NeedsPageBody locale="el" />
            <JsonLd data={[breadcrumbJsonLd(["needs"])]} />
        </>
    )
}
