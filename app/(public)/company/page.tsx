import type { Metadata } from "next"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import CompanyPageClient from "./CompanyPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, organizationJsonLd, teamJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("company")

export default function CompanyPage() {
    return (
        <StaticLanguageProvider language="el" counterpartPath="/en/company">
            <CompanyPageClient />
            <JsonLd data={[breadcrumbJsonLd(["company"]), organizationJsonLd(), ...teamJsonLd()]} />
        </StaticLanguageProvider>
    )
}
