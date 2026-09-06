import type { Metadata } from "next"
import { ChangelogSections } from "./ChangelogSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("changelog")

export default function ChangelogPage() {
    return (
        <>
            <ChangelogSections locale="el" />
            <JsonLd data={[breadcrumbJsonLd(["changelog"])]} />
        </>
    )
}
