import type { Metadata } from "next"
import { CompareSections } from "../../compare/CompareSections"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("compare", "en")

// No StaticLanguageProvider: CompareSections takes its locale as a prop and
// renders entirely on the server, so none of this copy ships as JS.
export default function ComparePageEnglish() {
    return (
        <>
            <CompareSections locale="en" />
            <JsonLd data={[breadcrumbEnJsonLd(["compare"])]} />
        </>
    )
}
