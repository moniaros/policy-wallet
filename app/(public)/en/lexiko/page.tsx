import type { Metadata } from "next"
import GlossaryIndexClient from "../../lexiko/GlossaryIndexClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd, definedTermSetJsonLd } from "@/lib/seo/jsonld"
import { glossaryTermLinks } from "@/lib/glossary/content"

export const metadata: Metadata = buildMarketingMetadata("lexiko", "en")

export default function GlossaryPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/lexiko">
            <GlossaryIndexClient />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["lexiko"]),
                    definedTermSetJsonLd({
                        path: "/en/lexiko",
                        name: "PolicyWallet insurance glossary",
                        description:
                            "Short, clear explanations of the key insurance terms, with a guide to finding each one in your own policy.",
                        inLanguage: "en",
                        terms: glossaryTermLinks("en").map((link) => ({
                            name: link.name,
                            path: `/en${link.path}`,
                        })),
                    }),
                ]}
            />
        </StaticLanguageProvider>
    )
}
