import Link from "next/link"
import {
    LEGAL_CONTENT_VERSION,
    LEGAL_LAST_UPDATED,
    getLegalContent,
    type LegalDocumentKind,
    type LegalLanguage,
} from "@/lib/legal/legal-content"

type LegalDocumentPageProps = {
    language: LegalLanguage
    documentKind: LegalDocumentKind
}

export function LegalDocumentPage({ language, documentKind }: LegalDocumentPageProps) {
    const content = getLegalContent(language)
    const document = content[documentKind]
    const alternateLanguage: LegalLanguage = language === "el" ? "en" : "el"
    const termsHref = `/terms?lang=${language}`
    const privacyHref = `/privacy?lang=${language}`

    return (
        <div className="min-h-screen bg-stone-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-stone-100 bg-white p-8 shadow-sm">
                <div className="mb-8 border-b border-stone-100 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link href="/" className="inline-block text-xl font-bold text-primary">
                            PolicyWallet
                        </Link>
                        <Link
                            href={`/${documentKind}?lang=${alternateLanguage}`}
                            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                        >
                            {content.ui.switchLanguage}
                        </Link>
                    </div>
                    <h1 className="mt-3 text-3xl font-bold text-stone-900">{document.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                        <span>{content.ui.lastUpdatedLabel}: {LEGAL_LAST_UPDATED}</span>
                        <span>{content.ui.versionLabel}: {LEGAL_CONTENT_VERSION}</span>
                    </div>
                </div>

                <div className="prose prose-stone max-w-none text-stone-700">
                    {document.intro.map((paragraph, index) => (
                        <p key={`intro-${index}`}>{paragraph}</p>
                    ))}

                    {document.sections.map((section) => (
                        <section key={section.id}>
                            <h3>{section.title}</h3>
                            {section.paragraphs.map((paragraph, index) => (
                                <p key={`${section.id}-${index}`}>{paragraph}</p>
                            ))}
                        </section>
                    ))}
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
                    <Link href={termsHref} className="text-sm font-semibold text-primary hover:text-primary-hover">
                        {content.ui.openTerms}
                    </Link>
                    <Link href={privacyHref} className="text-sm font-semibold text-primary hover:text-primary-hover">
                        {content.ui.openPrivacy}
                    </Link>
                    <span className="text-stone-300">|</span>
                    <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">
                        {content.ui.backToHome}
                    </Link>
                </div>
            </div>
        </div>
    )
}
