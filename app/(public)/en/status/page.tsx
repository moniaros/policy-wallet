import type { Metadata } from "next"
import { StatusSections } from "../../status/StatusSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("status", "en")

export default function StatusPageEnglish() {
    return (
        <>
            <StatusSections locale="en" />
            <JsonLd data={[breadcrumbEnJsonLd(["status"])]} />
        </>
    )
}
