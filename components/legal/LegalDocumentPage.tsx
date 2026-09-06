import Link from "next/link"
import {
    LEGAL_CONTENT_VERSION,
    LEGAL_DOC_META,
    LEGAL_LAST_UPDATED,
    getLegalContent,
    type LegalDocumentKind,
    type LegalLanguage,
} from "@/lib/legal/legal-content"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { SKIP_LINK_TARGET_ID } from "@/lib/nav/public-nav"
import { JsonLd, breadcrumbEnJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"
import { resolveLocale } from "@/lib/i18n/format"

type LegalDocumentPageProps = {
    language: LegalLanguage
    documentKind: LegalDocumentKind
}

/** Renders an ISO (yyyy-mm-dd) last-updated date in the reader's locale. */
function formatLastUpdated(isoDate: string, language: LegalLanguage): string {
    return new Intl.DateTimeFormat(resolveLocale(language), {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(new Date(`${isoDate}T00:00:00Z`))
}

export function LegalDocumentPage({ language, documentKind }: LegalDocumentPageProps) {
    const content = getLegalContent(language)
    const document = content[documentKind]

    // Terms/Privacy fall through to the shared GA constants so their header
    // renders exactly as before; only documents with their own revision in
    // LEGAL_DOC_META get a locale-formatted date and a per-document version.
    const documentMeta = LEGAL_DOC_META[documentKind]
    const lastUpdatedDisplay = documentMeta
        ? formatLastUpdated(documentMeta.lastUpdatedIso, language)
        : LEGAL_LAST_UPDATED
    const versionDisplay = documentMeta?.version ?? LEGAL_CONTENT_VERSION

    // In-document links between the legal set. English readers go to the real
    // /en documents rather than the Greek route's ?lang=en variant, which
    // served English under `lang="el"` with a canonical pointing at the Greek
    // doc. Greek keeps ?lang=el so a direct link holds its language.
    const legalHref = (kind: LegalDocumentKind) =>
        language === "en" ? `/en/${kind}` : `/${kind}?lang=el`
    const legalNavLinks: { href: string; label: string; kind: LegalDocumentKind }[] = [
        { href: legalHref("terms"), label: content.ui.openTerms, kind: "terms" },
        { href: legalHref("privacy"), label: content.ui.openPrivacy, kind: "privacy" },
        { href: legalHref("cookies"), label: content.ui.openCookies, kind: "cookies" },
        {
            href: legalHref("subprocessors"),
            label: content.ui.openSubprocessors,
            kind: "subprocessors",
        },
    ]

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
            <PublicHeader locale={language} />

            {/* The legal set was the only public surface without a
                BreadcrumbList — emitted here so all four documents (and both
                languages) get it from one place. */}
            <JsonLd
                data={
                    language === "en"
                        ? breadcrumbEnJsonLd([documentKind])
                        : breadcrumbJsonLd([documentKind])
                }
            />

            <main id={SKIP_LINK_TARGET_ID} tabIndex={-1} className="px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pt-32">
                {/* The card had NO dark variants while its muted line did (dark:text-stone-400),
                    so the background stayed white and the text lightened onto it — 2.59:1. */}
                <div className="mx-auto max-w-3xl rounded-2xl border border-stone-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-8 border-b border-stone-100 pb-4 dark:border-slate-800">
                        <h1 className="text-h2 font-bold text-stone-900 dark:text-white">{document.title}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-body-sm text-stone-500 dark:text-stone-400">
                            <span>{content.ui.lastUpdatedLabel}: {lastUpdatedDisplay}</span>
                            <span>{content.ui.versionLabel}: {versionDisplay}</span>
                        </div>
                    </div>

                    <div className="prose prose-stone max-w-none text-stone-700 dark:prose-invert dark:text-slate-300">
                        {document.intro.map((paragraph, index) => (
                            <p key={`intro-${index}`}>{paragraph}</p>
                        ))}

                        {/* h2, not h3: these sections sit directly under the
                            document h1, so an h3 made every legal page jump
                            h1 -> h3 in the outline. */}
                        {document.sections.map((section) => (
                            <section key={section.id}>
                                <h2 className="text-h3 font-semibold">{section.title}</h2>
                                {section.paragraphs.map((paragraph, index) => (
                                    <p key={`${section.id}-${index}`}>{paragraph}</p>
                                ))}
                                {section.table ? (
                                    /* Focusable + labelled: a plain
                                       overflow-x-auto scroller cannot be
                                       reached with a keyboard, so the columns
                                       past the fold were unreachable without a
                                       mouse. `relative` keeps the wide table
                                       from scrolling the whole document. */
                                    <div
                                        role="region"
                                        aria-label={section.title}
                                        tabIndex={0}
                                        className="relative overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                        <table className="min-w-full text-body-sm">
                                            <thead>
                                                <tr>
                                                    {section.table.headers.map((header) => (
                                                        <th key={header} className="text-left align-top">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {section.table.rows.map((row, rowIndex) => (
                                                    <tr key={`${section.id}-row-${rowIndex}`}>
                                                        {row.map((cell, cellIndex) => (
                                                            <td
                                                                key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}
                                                                className="align-top"
                                                            >
                                                                {cell}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                                {section.link ? (
                                    <p>
                                        <Link
                                            // Same locale rule as the nav strip: English readers
                                            // get the real /en document, not the Greek route's
                                            // ?lang=en variant.
                                            href={
                                                language === "en"
                                                    ? `/en${section.link.href}`
                                                    : `${section.link.href}?lang=el`
                                            }
                                            className="font-semibold text-primary hover:text-primary-hover"
                                        >
                                            {section.link.label}
                                        </Link>
                                    </p>
                                ) : null}
                            </section>
                        ))}
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6 dark:border-slate-800">
                        {legalNavLinks.map((link) => (
                            <Link
                                key={link.kind}
                                href={link.href}
                                className="inline-flex min-h-11 items-center text-body font-semibold text-primary hover:text-primary-hover"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <span className="text-stone-300 dark:text-slate-600">|</span>
                        <Link href={language === "en" ? "/en" : "/"} className="inline-flex min-h-11 items-center text-body font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white">
                            {content.ui.backToHome}
                        </Link>
                    </div>
                </div>
            </main>

            <PublicMegaFooter locale={language} />
        </div>
    )
}
