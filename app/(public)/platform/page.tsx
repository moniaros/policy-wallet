import type { Metadata } from "next"
import { PlatformSections, PLATFORM_FAQS } from "./PlatformSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("platform")

export default function PlatformPage() {
    return (
        <>
            <PlatformSections locale="el" />
            {/* FAQ markup is built from the SAME constants the page renders, so
                it can never answer something the page does not say. */}
            <JsonLd
                data={[
                    breadcrumbJsonLd(["platform"]),
                    faqPageJsonLd(PLATFORM_FAQS.map((item) => ({ question: item.q.el, answer: item.a.el }))),
                ]}
            />
        </>
    )
}
