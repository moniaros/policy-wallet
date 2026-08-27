import type { Metadata } from "next"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import GlossaryIndexClient from "./GlossaryIndexClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, definedTermSetJsonLd } from "@/lib/seo/jsonld"
import { glossaryTermLinks } from "@/lib/glossary/content"

export const metadata: Metadata = buildMarketingMetadata("lexiko")

export default function GlossaryPage() {
    return (
        <StaticLanguageProvider language="el" counterpartPath="/en/lexiko">
            <GlossaryIndexClient />
            <JsonLd
                data={[
                    breadcrumbJsonLd(["lexiko"]),
                    definedTermSetJsonLd({
                        path: "/lexiko",
                        name: "Ασφαλιστικό λεξικό PolicyWallet",
                        description:
                            "Σύντομες, ξεκάθαρες εξηγήσεις των βασικών ασφαλιστικών όρων στα ελληνικά, με οδηγό για το πού βρίσκεται ο καθένας στο δικό σας ασφαλιστήριο.",
                        inLanguage: "el",
                        terms: glossaryTermLinks("el"),
                    }),
                ]}
            />
        </StaticLanguageProvider>
    )
}
