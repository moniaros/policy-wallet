import type { Metadata } from "next"
import { ChangelogSections } from "../../changelog/ChangelogSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("changelog", "en")

export default function ChangelogPageEnglish() {
    return (
        <>
            <ChangelogSections locale="en" />
            <JsonLd data={[breadcrumbEnJsonLd(["changelog"])]} />
        </>
    )
}
