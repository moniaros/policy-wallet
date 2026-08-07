import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage"
import { resolveLegalLanguage } from "@/lib/legal/legal-content"
import { buildLegalPageMetadata } from "@/lib/seo/marketing-pages"

// Greek is the language of this URL. `?lang=` is the only override —
// Accept-Language used to decide, which served the English document to
// English-locale browsers on the Greek route; see resolveLegalLanguage.
export async function generateMetadata({ searchParams }: PrivacyPageProps): Promise<Metadata> {
    const params = await resolveSearchParams(searchParams)
    const language = resolveLegalLanguage(params.lang)
    return buildLegalPageMetadata("privacy", language)
}

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
    const language = resolveLegalLanguage(params.lang)

    return <LegalDocumentPage language={language} documentKind="privacy" />
}
