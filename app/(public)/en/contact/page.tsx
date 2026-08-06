import type { Metadata } from "next"
import ContactPageClient from "../../contact/ContactPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd, organizationJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("contact", "en")

export default function ContactPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/contact">
            <ContactPageClient locale="en" />
            <JsonLd data={[breadcrumbEnJsonLd(["contact"]), organizationJsonLd("en")]} />
        </StaticLanguageProvider>
    )
}
