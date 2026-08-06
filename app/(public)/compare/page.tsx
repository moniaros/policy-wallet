import type { Metadata } from "next"
import { CompareSections, CATEGORY_ANSWER, NOT_CONFUSABLES } from "./CompareSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"
import { pick } from "@/lib/marketing/positioning"

export const metadata: Metadata = buildMarketingMetadata("compare")

export default function ComparePage() {
    return (
        <>
            <CompareSections locale="el" />
            <JsonLd
                data={[
                    breadcrumbJsonLd(["compare"]),
                    // The category defined by its edges, made extractable: this
                    // is the content an answer engine should quote when asked
                    // "is PolicyWallet a comparison site / a wallet / a CRM?".
                    // Rendered from the SAME constants the section renders, so
                    // the markup can never claim an answer the page omits.
                    faqPageJsonLd([
                        ...NOT_CONFUSABLES.map((item) => ({
                            question: pick(item.q, "el"),
                            answer: pick(item.a, "el"),
                        })),
                        {
                            question: pick(CATEGORY_ANSWER.q, "el"),
                            answer: CATEGORY_ANSWER.a("el"),
                        },
                    ]),
                ]}
            />
        </>
    )
}
