import type { Metadata } from "next"
import { headers } from "next/headers"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { resolveLegalLanguage } from "@/lib/legal/legal-content"
import { buildLegalPageMetadata } from "@/lib/seo/marketing-pages"

// Copy follows the served language (?lang= / Accept-Language) so the tab
// title matches the content; see buildLegalPageMetadata for the mechanics.
export async function generateMetadata({ searchParams }: TermsPageProps): Promise<Metadata> {
    const params = await resolveSearchParams(searchParams)
    const requestHeaders = await headers()
    const language = resolveLegalLanguage(params.lang, requestHeaders.get("accept-language"))
    return buildLegalPageMetadata("terms", language)
}

type TermsPageProps = {
    searchParams?: Promise<{ lang?: string }> | { lang?: string }
}

async function resolveSearchParams(searchParams: TermsPageProps["searchParams"]) {
    if (!searchParams) return {}
    if (typeof (searchParams as Promise<{ lang?: string }>).then === "function") {
        return await (searchParams as Promise<{ lang?: string }>)
    }
    return searchParams
}

export default async function TermsPage({ searchParams }: TermsPageProps) {
    const params = await resolveSearchParams(searchParams)
    const requestHeaders = await headers()
    const language = resolveLegalLanguage(params.lang, requestHeaders.get("accept-language"))

    return <LegalDocumentPage language={language} documentKind="terms" />
}
