import type { Metadata } from "next"
import { headers } from "next/headers"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { resolveLegalLanguage } from "@/lib/legal/legal-content"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"

export const metadata: Metadata = buildMarketingMetadata("privacy")

type PrivacyPageProps = {
    searchParams?: Promise<{ lang?: string }> | { lang?: string }
}

async function resolveSearchParams(searchParams: PrivacyPageProps["searchParams"]) {
    if (!searchParams) return {}
    if (typeof (searchParams as Promise<{ lang?: string }>).then === "function") {
        return await (searchParams as Promise<{ lang?: string }>)
    }
    return searchParams
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
    const params = await resolveSearchParams(searchParams)
    const requestHeaders = await headers()
    const language = resolveLegalLanguage(params.lang, requestHeaders.get("accept-language"))

    return <LegalDocumentPage language={language} documentKind="privacy" />
}
