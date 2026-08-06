import type { Metadata } from "next"
import AgentsSolutionPageClient from "../../../solutions/agents/AgentsSolutionPageClient"
import { AGENT_FAQS } from "../../../solutions/agents/faqs"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { JsonLd, breadcrumbEnJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("solutions-agents", "en")

export default function AgentsSolutionPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/solutions/agents">
            <AgentsSolutionPageClient />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["solutions-agents"]),
                    // See the Greek route: same array, same verbatim rule.
                    faqPageJsonLd(
                        AGENT_FAQS.map((item) => ({ question: item.q.en, answer: item.a.en }))
                    ),
                ]}
            />
        </StaticLanguageProvider>
    )
}
