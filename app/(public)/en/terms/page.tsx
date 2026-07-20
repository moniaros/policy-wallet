import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"

export const metadata: Metadata = buildMarketingMetadata("terms", "en")

export default function TermsPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/terms">
            <LegalDocumentPage language="en" documentKind="terms" />
        </StaticLanguageProvider>
    )
}
