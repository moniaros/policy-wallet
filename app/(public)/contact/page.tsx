import type { Metadata } from "next"
import ContactPageClient from "./ContactPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("contact")

export default function ContactPage() {
    return (
        <>
            <ContactPageClient />
            <JsonLd data={[breadcrumbJsonLd(["contact"]), organizationJsonLd()]} />
        </>
    )
}
