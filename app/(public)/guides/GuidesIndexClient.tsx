"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { guides } from "@/lib/guides/content"
import { localizeHref } from "@/lib/seo/locale-links"
import { HookTicker } from "@/components/growth/HookTicker"

/**
 * The guides index, as an index.
 *
 * It used to be sixteen `p-10` cards stacked one per row: every guide got the
 * same weight, the titles sat at the same size as the body copy around them,
 * and finding the one you wanted meant scrolling past fifteen you did not. A
 * reader arriving from a search result is scanning HEADLINES, so the headline
 * is now the only thing at full weight and everything else — date, reading
 * time, the summary — is set below it in the size it earns.
 *
 * The lead item is the most recently updated one, given a larger headline and
 * its full direct-answer summary. The rest are hairline-separated rows. No
 * cards: a card is a container for things that need separating from a busy
 * background, and this page has no background to separate from.
 *
 * WHAT MAKES IT LEGIBLE TO MACHINES, and why each piece is here:
 *
 *  - Every row is an `<article>` with an `<h2>`, inside an `<ol>`. Ordering is
 *    editorial and stated, not implied by DOM accident.
 *  - Dates are real `<time dateTime>` elements carrying BOTH published and
 *    updated. Freshness is the single strongest signal an evergreen guide has,
 *    and it was previously rendered as untagged text.
 *  - Each guide's `summary` — its own 40–60 word direct answer — is on the
 *    page, not only in the structured data. An answer engine that quotes this
 *    page quotes a sentence we wrote and stand behind.
 *  - The `guideIndexJsonLd` emitted by the route mirrors exactly this content.
 */
function formatDate(iso: string, language: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(
        language === "el" ? "el-GR" : "en-GB",
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
    )
}

/** Most recently updated first — the order the JSON-LD also declares. */
export function guidesNewestFirst() {
    return [...guides].sort((a, b) =>
        (b.dateModified || b.datePublished).localeCompare(a.dateModified || a.datePublished),
    )
}

export default function GuidesIndexClient() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    const ordered = guidesNewestFirst()
    const [lead, ...rest] = ordered

    const meta = (guide: (typeof ordered)[number]) => (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-[#5B6A7A] dark:text-slate-400">
            <time dateTime={guide.datePublished}>{formatDate(guide.datePublished, lang)}</time>
            {guide.dateModified && guide.dateModified !== guide.datePublished && (
                <>
                    <span aria-hidden>·</span>
                    <span>
                        {t("Ενημερώθηκε ", "Updated ")}
                        <time dateTime={guide.dateModified}>{formatDate(guide.dateModified, lang)}</time>
                    </span>
                </>
            )}
            <span aria-hidden>·</span>
            <span>{t(`${guide.readingMinutes} λεπτά ανάγνωσης`, `${guide.readingMinutes} min read`)}</span>
        </p>
    )

    return (
        <LoBPageShell activeNav="none" locale={language}>
            <section className="mx-auto max-w-[860px] px-6 pb-14 text-center md:px-12">
                <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-display dark:text-white">
                    {t("Οδηγοί ασφάλισης για την ελληνική αγορά", "Insurance guides for the Greek market")}
                </h1>
                <p className="mx-auto max-w-[620px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                    {t(
                        "Πρακτικές απαντήσεις στα ερωτήματα που καθορίζουν την κάλυψή σας: έκπτωση ΕΝΦΙΑ, κενά κάλυψης, κόστος σεισμού, ανανεώσεις και διαχείριση ασφαλιστηρίων — χωρίς ασφαλιστικά λατινικά.",
                        "Practical answers to the questions that decide your cover: ENFIA discount, coverage gaps, earthquake cost, renewals and managing your policies — without the insurance Latin.",
                    )}
                </p>
            </section>

            {/* Growth hooks — ROTATING here and only here: this page has
                no other rotator (D-G05). Under prefers-reduced-motion the
                component renders its static stack instead. */}
            <div className="mx-auto max-w-[820px] px-6 pb-10 md:px-12">
                <HookTicker locale={lang} mode="rotating" />
            </div>

            <div className="mx-auto max-w-[820px] px-6 pb-24 md:px-12">
                {/* Lead story. One item at full weight, so the page has a
                    starting point instead of sixteen equal ones. */}
                {lead && (
                    <article className="border-y border-[#E2E8F0] py-8 dark:border-slate-800">
                        {meta(lead)}
                        <h2 className="mt-2.5 text-h3 font-semibold leading-[1.15] tracking-[-0.03em] text-balance text-[#0F172A] md:text-h2 dark:text-white">
                            <Link
                                href={localizeHref(`/guides/${lead.slug}`, lang)}
                                className="transition-colors hover:text-[#29685B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:hover:text-[#A7F3D0] dark:focus-visible:outline-[#A7F3D0]"
                            >
                                {lead.title[lang]}
                            </Link>
                        </h2>
                        <p className="mt-3 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                            {lead.summary[lang]}
                        </p>
                    </article>
                )}

                <h2 className="sr-only">{t("Όλοι οι οδηγοί", "All guides")}</h2>
                <ol className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                    {rest.map((guide) => (
                        <li key={guide.slug}>
                            <article className="py-7">
                                {/* Headline first, metadata under it. A reader
                                    scanning this column is reading titles; the
                                    date is what they check once they have found
                                    the one they want. */}
                                <h3 className="text-title font-semibold leading-snug tracking-tight text-balance text-[#0F172A] md:text-lead dark:text-white">
                                    <Link
                                        href={localizeHref(`/guides/${guide.slug}`, lang)}
                                        className="transition-colors hover:text-[#29685B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:hover:text-[#A7F3D0] dark:focus-visible:outline-[#A7F3D0]"
                                    >
                                        {guide.title[lang]}
                                    </Link>
                                </h3>
                                <div className="mt-2">{meta(guide)}</div>
                                <p className="mt-2.5 line-clamp-2 text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                    {guide.summary[lang]}
                                </p>
                            </article>
                        </li>
                    ))}
                </ol>

                <p className="mt-10 border-t border-[#E2E8F0] pt-8 text-body text-[#5B6A7A] dark:border-slate-800 dark:text-slate-400">
                    {t(
                        "Δεν βρήκατε αυτό που ψάχνατε; Δείτε τι λέει το δικό σας ασφαλιστήριο.",
                        "Did not find what you were looking for? See what your own policy says.",
                    )}{" "}
                    <Link
                        href={localizeHref("/needs", lang)}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#29685B] underline-offset-4 hover:underline dark:text-[#A7F3D0]"
                    >
                        {t("Έλεγχος αναγκών σε 6 βήματα", "Needs check in 6 steps")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </p>
            </div>
        </LoBPageShell>
    )
}
