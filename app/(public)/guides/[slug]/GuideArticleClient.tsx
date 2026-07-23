"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, ExternalLink } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Guide } from "@/lib/guides/content"
import { localizeHref } from "@/lib/seo/locale-links"

function formatDate(iso: string, language: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(
        language === "el" ? "el-GR" : "en-GB",
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
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
                        className="inline-flex items-center gap-1.5 text-body font-medium text-[#29685B] transition-colors duration-150 hover:text-[#1C4E44]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("Όλοι οι οδηγοί", "All guides")}
                    </Link>
                </nav>

                <header className="mb-10">
                    <h1 className="mb-6 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] md:text-h1">
                        {guide.title[lang]}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 border-b border-[#E2E8F0] pb-6 text-body text-[#64748B]">
                        {/* Byline: named author when one is published, editorial team otherwise. */}
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                            {guide.author
                                ? `${guide.author.name} — ${guide.author.role[lang]}`
                                : t("Συντακτική ομάδα PolicyWallet", "PolicyWallet editorial team")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-[#29685B]" />
                            {t("Ενημερώθηκε", "Updated")}: {formatDate(guide.dateModified, language)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4 text-[#29685B]" />
                            {guide.readingMinutes} {t("λεπτά ανάγνωσης", "min read")}
                        </span>
                    </div>
                    {guide.author && (
                        <p className="mt-3 text-body-sm leading-relaxed text-[#64748B]">
                            {guide.author.bio[lang]}
                        </p>
                    )}
                </header>

                {/* Direct-answer opening paragraph (featured-snippet shape). */}
                <p className="mb-12 rounded-[14px] border border-[#DCEBDA] bg-[#F0FDF4] p-6 text-lead font-medium leading-relaxed text-[#0F172A]">
                    {guide.summary[lang]}
                </p>

                {guide.sections.map((section) => (
                    <section key={section.heading.en} className="mb-12">
                        <h2 className="mb-5 text-h3 font-semibold leading-snug tracking-tight text-[#0F172A]">
                            {section.heading[lang]}
                        </h2>
                        {section.paragraphs.map((paragraph) => (
                            <p
                                key={paragraph.en.slice(0, 40)}
                                className="mb-4 text-body-lg leading-[1.75] text-[#334155]"
                            >
                                {paragraph[lang]}
                            </p>
                        ))}
                        {section.bullets ? (
                            <ul className="mt-4 space-y-3">
                                {section.bullets.map((bullet) => (
                                    <li
                                        key={bullet.en.slice(0, 40)}
                                        className="flex items-start gap-3 text-body-lg leading-relaxed text-[#334155]"
                                    >
                                        <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#29685B]" />
                                        {bullet[lang]}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </section>
                ))}

                <section className="mb-12">
                    <h2 className="mb-6 text-h3 font-semibold leading-snug tracking-tight text-[#0F172A]">
                        {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                    </h2>
                    <div className="space-y-6">
                        {guide.faq.map((item) => (
                            <div key={item.question.en} className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
                                <h3 className="mb-2 text-lead font-semibold text-[#0F172A]">
                                    {item.question[lang]}
                                </h3>
                                <p className="text-body leading-relaxed text-[#475569]">
                                    {item.answer[lang]}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-14">
                    <h2 className="mb-4 text-lead font-semibold text-[#0F172A]">
                        {t("Πηγές", "Sources")}
                    </h2>
                    <ul className="space-y-2">
                        {guide.sources.map((source) => (
                            <li key={source.url}>
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-1.5 text-body text-[#29685B] underline-offset-4 transition-colors duration-150 hover:text-[#1C4E44] hover:underline"
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
                        <h2 className="mb-4 text-lead font-semibold text-[#0F172A]">
                            {t("Σχετικοί οδηγοί και σελίδες", "Related guides and pages")}
                        </h2>
                        <ul className="space-y-2">
                            {guide.related.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={localizeHref(item.href, language)}
                                        className="inline-flex items-center gap-1.5 text-body text-[#29685B] underline-offset-4 transition-colors duration-150 hover:text-[#1C4E44] hover:underline"
                                    >
                                        {item.label[lang]}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <aside className="rounded-2xl bg-[#1A2420] p-8 text-white md:p-10">
                    <h2 className="mb-3 text-h3 font-semibold tracking-tight">
                        {t(
                            "Ελέγξτε τα δικά σας συμβόλαια σε 2 λεπτά",
                            "Check your own policies in 2 minutes"
                        )}
                    </h2>
                    <p className="mb-6 text-body leading-relaxed text-white/70">
                        {t(
                            "Ανεβάστε τα ασφαλιστήριά σας και η AI του PolicyWallet εντοπίζει κενά, επικαλύψεις και ευκαιρίες — δωρεάν, χωρίς πιστωτική κάρτα.",
                            "Upload your policies and PolicyWallet's AI detects gaps, overlaps, and opportunities — free, no credit card required."
                        )}
                    </p>
                    <Link
                        href="/auth/signup"
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
