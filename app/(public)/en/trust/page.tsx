import type { Metadata } from "next"
import { TrustSections, TRUST_FAQS } from "../../trust/TrustSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("trust", "en")

export default function TrustPageEnglish() {
    return (
        <>
            <TrustSections locale="en" />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["trust"]),
                    faqPageJsonLd(TRUST_FAQS.map((item) => ({ question: item.q.en, answer: item.a.en }))),
                ]}
            />
        </>
    )
}
