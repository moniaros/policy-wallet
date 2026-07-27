"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Clock3 } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { guides } from "@/lib/guides/content"
import { localizeHref } from "@/lib/seo/locale-links"

function formatDate(iso: string, language: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(
        language === "el" ? "el-GR" : "en-GB",
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
    )
}

export default function GuidesIndexClient() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    return (
        <LoBPageShell activeNav="none" locale={language}>
            <section className="mx-auto max-w-[860px] px-6 pb-16 text-center md:px-12">
                <p className="mb-4 text-body-sm font-semibold uppercase tracking-widest text-[#29685B]">
                    {t("Οδηγοί", "Guides")}
                </p>
                <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-display dark:text-white">
                    {t(
                        "Οδηγοί ασφάλισης για την ελληνική αγορά",
                        "Insurance guides for the Greek market"
                    )}
                </h1>
                <p className="mx-auto max-w-[620px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                    {t(
                        "Πρακτικές απαντήσεις στα ερωτήματα που καθορίζουν την κάλυψή σας: έκπτωση ΕΝΦΙΑ, κενά κάλυψης, κόστος σεισμού, ανανεώσεις και διαχείριση συμβολαίων — χωρίς ασφαλιστικά λατινικά.",
                        "Practical answers to the questions that shape your coverage: the ENFIA discount, coverage gaps, earthquake cost, renewals and managing your policies — without insurance jargon."
                    )}
                </p>
            </section>

            <section className="mx-auto max-w-[1040px] px-6 pb-24 md:px-12">
                <div className="grid gap-6">
                    {guides.map((guide) => (
                        <Link
                            key={guide.slug}
                            href={localizeHref(`/guides/${guide.slug}`, language)}
                            className="group rounded-2xl border border-[#E2E8F0] bg-white p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] md:p-10 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="mb-4 flex flex-wrap items-center gap-4 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                                <span className="inline-flex items-center gap-1.5">
                                    <BookOpen className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                                    {formatDate(guide.dateModified, language)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4 text-[#29685B] dark:text-[#A7F3D0]" />
                                    {guide.readingMinutes} {t("λεπτά ανάγνωσης", "min read")}
                                </span>
                            </div>
                            <h2 className="mb-3 text-h3 font-semibold leading-snug tracking-tight text-[#0F172A] transition-colors duration-150 group-hover:text-[#29685B] dark:text-white dark:group-hover:text-[#A7F3D0]">
                                {guide.title[lang]}
                            </h2>
                            <p className="mb-5 max-w-[760px] text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {guide.summary[lang]}
                            </p>
                            <span className="inline-flex items-center gap-1.5 text-body font-semibold text-[#29685B] transition-all duration-150 group-hover:gap-2.5 dark:text-[#A7F3D0]">
                                {t("Διαβάστε τον οδηγό", "Read the guide")}
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </LoBPageShell>
    )
}
