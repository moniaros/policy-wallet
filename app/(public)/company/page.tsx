import type { Metadata } from "next"
import CompanyPageClient from "./CompanyPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, organizationJsonLd, teamJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("company")

export default function CompanyPage() {
    return (
        <>
            <CompanyPageClient />
            <JsonLd data={[breadcrumbJsonLd(["company"]), organizationJsonLd(), ...teamJsonLd()]} />
        </>
    )
}
