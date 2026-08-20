import type { Metadata } from "next"
import { PlatformSections, PLATFORM_FAQS } from "../../platform/PlatformSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("platform", "en")

export default function PlatformPageEnglish() {
    return (
        <>
            <PlatformSections locale="en" />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["platform"]),
                    faqPageJsonLd(PLATFORM_FAQS.map((item) => ({ question: item.q.en, answer: item.a.en }))),
                ]}
            />
        </>
    )
}
