import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"

export const metadata: Metadata = buildMarketingMetadata("subprocessors", "en")

export default function SubprocessorsPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/subprocessors">
            <LegalDocumentPage language="en" documentKind="subprocessors" />
        </StaticLanguageProvider>
    )
}
