"use client"

import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { glossaryTerms } from "@/lib/glossary/content"
import { localizeHref } from "@/lib/seo/locale-links"

export default function GlossaryIndexClient() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    return (
        <LoBPageShell activeNav="none" locale={language}>
            <section className="mx-auto max-w-[860px] px-6 pb-16 text-center md:px-12">
                <p className="mb-4 text-body-sm font-semibold uppercase tracking-widest text-[#29685B]">
                    {t("Ασφαλιστικό λεξικό", "Insurance glossary")}
                </p>
                <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-display dark:text-white">
                    {t(
                        "Οι ασφαλιστικοί όροι σε απλά ελληνικά",
                        "Insurance terms in plain language"
                    )}
                </h1>
                <p className="mx-auto max-w-[620px] text-lead leading-relaxed text-[#475569] dark:text-slate-400">
                    {t(
                        "Απαλλαγή, εξαίρεση, ασφαλισμένο κεφάλαιο: σύντομες, ξεκάθαρες εξηγήσεις για τους όρους που καθορίζουν τι πληρώνετε και τι λαμβάνετε — με οδηγό για το πού να τους βρείτε στο δικό σας συμβόλαιο.",
                        "Deductible, exclusion, sum insured: short, clear explanations of the terms that decide what you pay and what you receive — with a guide to finding each one in your own policy."
                    )}
                </p>
            </section>

            <section className="mx-auto max-w-[1040px] px-6 pb-24 md:px-12">
                <div className="grid gap-5 sm:grid-cols-2">
                    {glossaryTerms.map((entry) => (
                        <Link
                            key={entry.slug}
                            href={localizeHref(`/lexiko/${entry.slug}`, language)}
                            className="group rounded-2xl border border-[#E2E8F0] bg-white p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="mb-3 inline-flex items-center gap-1.5 text-body-sm text-[#5B6A7A]">
                                <BookOpen className="h-4 w-4 text-[#29685B]" />
                                {t("Ορισμός", "Definition")}
                            </div>
                            <h2 className="mb-2 text-title font-semibold leading-snug tracking-tight text-[#0F172A] transition-colors duration-150 group-hover:text-[#29685B] dark:text-white">
                                {entry.term[lang]}
                            </h2>
                            <p className="mb-4 line-clamp-3 text-body leading-relaxed text-[#475569] dark:text-slate-400">
                                {entry.shortDefinition[lang]}
                            </p>
                            <span className="inline-flex items-center gap-1.5 text-body font-semibold text-[#29685B] transition-all duration-150 group-hover:gap-2.5">
                                {t("Διαβάστε τον ορισμό", "Read the definition")}
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </LoBPageShell>
    )
}
