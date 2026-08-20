import type { Metadata } from "next"
import { TrustSections, TRUST_FAQS } from "./TrustSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("trust")

export default function TrustPage() {
    return (
        <>
            <TrustSections locale="el" />
            {/* FAQ markup is built from the SAME constants the page renders, so
                it can never answer something the page does not say. */}
            <JsonLd
                data={[
                    breadcrumbJsonLd(["trust"]),
                    faqPageJsonLd(TRUST_FAQS.map((item) => ({ question: item.q.el, answer: item.a.el }))),
                ]}
            />
        </>
    )
}
