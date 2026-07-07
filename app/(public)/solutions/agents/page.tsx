import type { Metadata } from "next"
import AgentsSolutionPageClient from "./AgentsSolutionPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("solutions-agents")

export default function AgentsSolutionPage() {
    return (
        <>
            <AgentsSolutionPageClient />
            <JsonLd data={breadcrumbJsonLd(["solutions-agents"])} />
        </>
    )
}
