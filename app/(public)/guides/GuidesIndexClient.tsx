"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Clock3 } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { guides } from "@/lib/guides/content"

function formatDate(iso: string, language: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(
        language === "el" ? "el-GR" : "en-US",
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
    )
}

export default function GuidesIndexClient() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    return (
        <LoBPageShell activeNav="none">
            <section className="mx-auto max-w-[860px] px-6 pb-16 text-center md:px-12">
                <p className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[#29685B]">
                    {t("Οδηγοί", "Guides")}
                </p>
                <h1 className="mb-6 text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-[56px]">
                    {t(
                        "Οδηγοί ασφάλισης για την ελληνική αγορά",
                        "Insurance guides for the Greek market"
                    )}
                </h1>
                <p className="mx-auto max-w-[620px] text-[18px] leading-relaxed text-[#475569]">
                    {t(
                        "Πρακτικές απαντήσεις στα ερωτήματα που καθορίζουν την κάλυψή σας: έκπτωση ΕΝΦΙΑ, κενά κάλυψης και σωστές ανανεώσεις — χωρίς ασφαλιστικά λατινικά.",
                        "Practical answers to the questions that shape your coverage: the ENFIA discount, coverage gaps, and smart renewals — without insurance jargon."
                    )}
                </p>
            </section>

            <section className="mx-auto max-w-[1040px] px-6 pb-24 md:px-12">
                <div className="grid gap-6">
                    {guides.map((guide) => (
                        <Link
                            key={guide.slug}
                            href={`/guides/${guide.slug}`}
                            className="group rounded-[20px] border border-[#E5E7EB] bg-white p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] md:p-10"
                        >
                            <div className="mb-4 flex flex-wrap items-center gap-4 text-[13px] text-[#64748B]">
                                <span className="inline-flex items-center gap-1.5">
                                    <BookOpen className="h-4 w-4 text-[#29685B]" />
                                    {formatDate(guide.dateModified, language)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4 text-[#29685B]" />
                                    {guide.readingMinutes} {t("λεπτά ανάγνωσης", "min read")}
                                </span>
                            </div>
                            <h2 className="mb-3 text-[24px] font-medium leading-snug tracking-tight text-[#0F172A] transition-colors duration-150 group-hover:text-[#29685B] md:text-[28px]">
                                {guide.title[lang]}
                            </h2>
                            <p className="mb-5 max-w-[760px] text-[16px] leading-relaxed text-[#475569]">
                                {guide.summary[lang]}
                            </p>
                            <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#29685B] transition-all duration-150 group-hover:gap-2.5">
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
