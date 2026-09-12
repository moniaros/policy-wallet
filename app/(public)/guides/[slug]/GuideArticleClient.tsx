"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, ExternalLink, X } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Guide, GuideTable, LocalizedString } from "@/lib/guides/content"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import { resolveLocale } from "@/lib/i18n/format"

function formatDate(iso: string, language: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(
        resolveLocale(language),
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
    )
}

/** Stable React key for a cell, which may be a ✓/✗ boolean rather than text. */
function cellKey(cell: LocalizedString | boolean, columnIndex: number): string {
    return typeof cell === "boolean" ? `bool-${columnIndex}-${cell}` : cell.en.slice(0, 40)
}

function GuideTableCell({ cell, lang }: { cell: LocalizedString | boolean; lang: "el" | "en" }) {
    if (typeof cell !== "boolean") {
        return <span className="text-body text-[#334155] dark:text-slate-300">{cell[lang]}</span>
    }
    return cell ? (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#DCFCE7] dark:bg-[#29685B]/25">
            <Check className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
            <span className="sr-only">{lang === "el" ? "Ναι" : "Yes"}</span>
        </span>
    ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FEE2E2] dark:bg-red-900/40">
            <X className="h-4 w-4 text-[#DC2626] dark:text-red-300" />
            <span className="sr-only">{lang === "el" ? "Όχι" : "No"}</span>
        </span>
    )
}

/**
 * Comparison / worked-example table. Scrolls inside its own container so a wide
 * matrix never makes the page itself scroll sideways on a phone.
 */
function GuideTableBlock({ table, lang }: { table: GuideTable; lang: "el" | "en" }) {
    return (
        <figure className="mt-6">
            <figcaption className="mb-3 text-body-sm font-medium leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                {table.caption[lang]}
            </figcaption>
            {/* [contain:paint] is load-bearing: without it the wide table's
                overflow escaped this scroll container and became PAGE-level
                horizontal scroll — 869px of blank white at 320px, the classic
                "site is broken on my phone". Wide content must scroll inside
                its own container; the page body never scrolls sideways. */}
            <div className="overflow-x-auto rounded-[14px] border border-[#E2E8F0] [contain:paint] dark:border-slate-800">
                <table
                    className="w-full border-collapse text-left"
                    aria-label={table.caption[lang]}
                >
                    <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] dark:border-slate-800 dark:bg-slate-900">
                            {table.columns.map((column) => (
                                <th
                                    key={column.en.slice(0, 40)}
                                    scope="col"
                                    className="whitespace-nowrap px-4 py-3 text-body-sm font-semibold text-[#0F172A] dark:text-white"
                                >
                                    {column[lang]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {table.rows.map((row) => {
                            const [header, ...values] = row.cells
                            return (
                                <tr
                                    key={cellKey(header, 0)}
                                    className="border-b border-[#F1F5F9] last:border-b-0 dark:border-slate-800/70"
                                >
                                    <th
                                        scope="row"
                                        className="px-4 py-3 text-body-sm font-semibold text-[#0F172A] dark:text-white"
                                    >
                                        <GuideTableCell cell={header} lang={lang} />
                                    </th>
                                    {values.map((cell, index) => (
                                        <td key={cellKey(cell, index + 1)} className="px-4 py-3 text-body-sm">
                                            <GuideTableCell cell={cell} lang={lang} />
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {table.note ? (
                <p className="mt-3 text-body-sm leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                    {table.note[lang]}
                </p>
            ) : null}
        </figure>
    )
}

export default function GuideArticleClient({ guide }: { guide: Guide }) {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    return (
        <LoBPageShell activeNav="none" locale={language}>
            <article className="mx-auto max-w-[760px] px-6 pb-24 md:px-0">
                <nav className="mb-8">
                    <Link
                        href={localizeHref("/guides", language)}
                        className="inline-flex items-center gap-1.5 text-body font-medium text-[#29685B] transition-colors duration-150 hover:text-[#1C4E44] dark:text-[#A7F3D0] dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("Όλοι οι οδηγοί", "All guides")}
                    </Link>
                </nav>

                <header className="mb-10">
                    <h1 className="mb-6 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] md:text-h1 dark:text-white">
                        {guide.title[lang]}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 border-b border-[#E2E8F0] pb-6 text-body text-[#5B6A7A] dark:border-slate-800 dark:text-slate-400">
                        {/* Byline: named author when one is published, editorial team otherwise. */}
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#334155] dark:text-slate-300">
                            {guide.author
                                ? `${guide.author.name} — ${guide.author.role[lang]}`
                                : t("Συντακτική ομάδα PolicyWallet", "PolicyWallet editorial team")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                            {t("Ενημερώθηκε", "Updated")}: {formatDate(guide.dateModified, language)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                            {guide.readingMinutes} {t("λεπτά ανάγνωσης", "min read")}
                        </span>
                    </div>
                    {guide.author && (
                        <p className="mt-3 text-body-sm leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                            {guide.author.bio[lang]}
                        </p>
                    )}
                </header>

                {/* Direct-answer opening paragraph (featured-snippet shape). */}
                <p className="mb-12 rounded-[14px] border border-[#DCEBDA] bg-[#F0FDF4] p-6 text-lead font-medium leading-relaxed text-[#0F172A] dark:border-[#29685B]/40 dark:bg-[#29685B]/15 dark:text-slate-100">
                    {guide.summary[lang]}
                </p>

                {guide.sections.map((section) => (
                    <section key={section.heading.en} className="mb-12">
                        <h2 className="mb-5 text-h3 font-semibold leading-snug tracking-tight text-[#0F172A] dark:text-white">
                            {section.heading[lang]}
                        </h2>
                        {section.paragraphs.map((paragraph) => (
                            <p
                                key={paragraph.en.slice(0, 40)}
                                className="mb-4 text-body-lg leading-[1.75] text-[#334155] dark:text-slate-300"
                            >
                                {paragraph[lang]}
                            </p>
                        ))}
                        {section.bullets ? (
                            <ul className="mt-4 space-y-3">
                                {section.bullets.map((bullet) => (
                                    <li
                                        key={bullet.en.slice(0, 40)}
                                        className="flex items-start gap-3 text-body-lg leading-relaxed text-[#334155] dark:text-slate-300"
                                    >
                                        <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#29685B]" />
                                        {bullet[lang]}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        {section.table ? (
                            <GuideTableBlock table={section.table} lang={lang} />
                        ) : null}
                    </section>
                ))}

                <section className="mb-12">
                    <h2 className="mb-6 text-h3 font-semibold leading-snug tracking-tight text-[#0F172A] dark:text-white">
                        {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                    </h2>
                    <div className="space-y-6">
                        {guide.faq.map((item) => (
                            <div
                                key={item.question.en}
                                className="rounded-[14px] border border-[#E2E8F0] bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                            >
                                <h3 className="mb-2 text-lead font-semibold text-[#0F172A] dark:text-slate-100">
                                    {item.question[lang]}
                                </h3>
                                <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                    {item.answer[lang]}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-14">
                    <h2 className="mb-4 text-lead font-semibold text-[#0F172A] dark:text-white">
                        {t("Πηγές", "Sources")}
                    </h2>
                    <ul className="space-y-2">
                        {guide.sources.map((source) => (
                            <li key={source.url}>
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-1.5 text-body text-[#29685B] underline-offset-4 transition-colors duration-150 hover:text-[#1C4E44] hover:underline dark:text-[#A7F3D0] dark:hover:text-white"
                                >
                                    {source.label[lang]}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>

                {guide.related && guide.related.length > 0 && (
                    <section className="mb-14">
                        <h2 className="mb-4 text-lead font-semibold text-[#0F172A] dark:text-white">
                            {t("Σχετικοί οδηγοί και σελίδες", "Related guides and pages")}
                        </h2>
                        <ul className="space-y-2">
                            {guide.related.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={localizeHref(item.href, language)}
                                        className="inline-flex items-center gap-1.5 text-body text-[#29685B] underline-offset-4 transition-colors duration-150 hover:text-[#1C4E44] hover:underline dark:text-[#A7F3D0] dark:hover:text-white"
                                    >
                                        {item.label[lang]}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <aside className="rounded-2xl bg-cta-dark p-8 text-white md:p-10">
                    <h2 className="mb-3 text-h3 font-semibold tracking-tight">
                        {t(
                            "Ελέγξτε τα δικά σας ασφαλιστήρια σε λίγα λεπτά",
                            "Check your own policies in minutes"
                        )}
                    </h2>
                    {/* The free tier ships a basic summary for one policy; gap
                        detection is a paid feature — the CTA says so instead
                        of promising free AI gap analysis. */}
                    <p className="mb-6 text-body leading-relaxed text-white/70">
                        {t(
                            "Ξεκινήστε δωρεάν με τρία ασφαλιστήρια, χωρίς κάρτα — τα διαβάζουμε και σας δείχνουμε τι καλύπτουν και τι κενά έχουν. Στο πλάνο Family, η AI εντοπίζει και τις επικαλύψεις μεταξύ τους.",
                            "Start free with three policies, no card — we read them and show you what they cover, gaps included."
                        )}
                    </p>
                    <Link
                        href={authHref("/auth/signup", language)}
                        className="pw-primary-button-mint"
                    >
                        {t("Ξεκινήστε δωρεάν", "Get started free")}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </aside>
            </article>
        </LoBPageShell>
    )
}
