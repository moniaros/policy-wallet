import type { Metadata } from "next"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import AgentsSolutionPageClient from "./AgentsSolutionPageClient"
import { AGENT_FAQS } from "./faqs"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("solutions-agents")

export default function AgentsSolutionPage() {
    return (
        <StaticLanguageProvider language="el" counterpartPath="/en/solutions/agents">
            <AgentsSolutionPageClient />
            <JsonLd
                data={[
                    breadcrumbJsonLd(["solutions-agents"]),
                    // Rendered from the same array the page displays, so the
                    // CRM negative is extractable and can never drift.
                    faqPageJsonLd(
                        AGENT_FAQS.map((item) => ({ question: item.q.el, answer: item.a.el }))
                    ),
                ]}
            />
        </StaticLanguageProvider>
    )
}
