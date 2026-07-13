import type { Metadata } from "next"
import CompanyPageClient from "../../company/CompanyPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd, organizationJsonLd, teamJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("company", "en")

export default function CompanyPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/company">
            <CompanyPageClient />
            <JsonLd data={[breadcrumbEnJsonLd(["company"]), organizationJsonLd(), ...teamJsonLd()]} />
        </StaticLanguageProvider>
    )
}
