import type { Metadata } from "next"
import { CompareSections, CATEGORY_ANSWER, NOT_CONFUSABLES } from "../../compare/CompareSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"
import { pick } from "@/lib/marketing/positioning"

export const metadata: Metadata = buildMarketingMetadata("compare", "en")

// No StaticLanguageProvider: CompareSections takes its locale as a prop and
// renders entirely on the server, so none of this copy ships as JS.
export default function ComparePageEnglish() {
    return (
        <>
            <CompareSections locale="en" />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["compare"]),
                    // See the Greek route: same constants, same verbatim rule.
                    faqPageJsonLd([
                        ...NOT_CONFUSABLES.map((item) => ({
                            question: pick(item.q, "en"),
                            answer: pick(item.a, "en"),
                        })),
                        {
                            question: pick(CATEGORY_ANSWER.q, "en"),
                            answer: CATEGORY_ANSWER.a("en"),
                        },
                    ]),
                ]}
            />
        </>
    )
}
