import type { Metadata } from "next"
import { StatusSections } from "./StatusSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("status")

export default function StatusPage() {
    return (
        <>
            <StatusSections locale="el" />
            <JsonLd data={[breadcrumbJsonLd(["status"])]} />
        </>
    )
}
