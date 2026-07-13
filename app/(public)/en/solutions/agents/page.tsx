import type { Metadata } from "next"
import AgentsSolutionPageClient from "../../../solutions/agents/AgentsSolutionPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("solutions-agents", "en")

export default function AgentsSolutionPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/solutions/agents">
            <AgentsSolutionPageClient />
            <JsonLd data={breadcrumbEnJsonLd(["solutions-agents"])} />
        </StaticLanguageProvider>
    )
}
