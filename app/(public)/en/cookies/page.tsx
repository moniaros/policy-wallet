import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"

export const metadata: Metadata = buildMarketingMetadata("cookies", "en")

export default function CookiesPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/cookies">
            <LegalDocumentPage language="en" documentKind="cookies" />
        </StaticLanguageProvider>
    )
}
