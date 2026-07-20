import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"

export const metadata: Metadata = buildMarketingMetadata("privacy", "en")

export default function PrivacyPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/privacy">
            <LegalDocumentPage language="en" documentKind="privacy" />
        </StaticLanguageProvider>
    )
}
