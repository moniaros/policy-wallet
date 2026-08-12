"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight, Check, ChevronRight, ShieldCheck } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import type { GlossaryTerm } from "@/lib/glossary/content"
import { localizeHref, authHref } from "@/lib/seo/locale-links"

export default function GlossaryTermClient({ entry }: { entry: GlossaryTerm }) {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"
    const l = (href: string) => localizeHref(href, language)

    return (
        <LoBPageShell activeNav="none" locale={language}>
            <article className="mx-auto max-w-[760px] px-6 pb-16 md:px-12">
                {/* Breadcrumb */}
                <nav className="mb-8 flex flex-wrap items-center gap-1.5 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                    <Link href={l("/lexiko")} className="hover:text-[#29685B]">
                        {t("Ασφαλιστικό λεξικό", "Insurance glossary")}
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-[#0F172A] dark:text-slate-300">{entry.term[lang]}</span>
                </nav>

                <h1 className="mb-6 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] md:text-h1 dark:text-white">
                    {entry.term[lang]}
                </h1>

                {/* Answer-first block — the extractable definition (AEO) */}
                <p className="mb-8 border-l-2 border-[#29685B] pl-5 text-title leading-relaxed text-[#0F172A] dark:text-slate-200">
                    {entry.shortDefinition[lang]}
                </p>

                {entry.aliases && entry.aliases.length > 0 && (
                    <p className="mb-8 text-body text-[#5B6A7A] dark:text-slate-400">
                        {t("Γνωστό και ως:", "Also known as:")}{" "}
                        <span className="text-[#475569] dark:text-slate-300">
                            {entry.aliases.map((alias) => alias[lang]).join(" · ")}
                        </span>
                    </p>
                )}

                <div className="space-y-5 text-lead leading-relaxed text-[#334155] dark:text-slate-300">
                    {entry.body.map((paragraph, index) => (
                        <p key={index}>{paragraph[lang]}</p>
                    ))}
                </div>

                {/* How to check it in YOUR policy — honesty-safe, actionable */}
                <div className="mt-10 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center gap-2 text-body font-semibold text-[#0F172A] dark:text-white">
                        <ShieldCheck className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                        {t("Πώς το ελέγχετε στο συμβόλαιό σας", "How to check it in your policy")}
                    </div>
                    <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                        {entry.howToCheck[lang]}
                    </p>
                    <Link
                        href={authHref(`/auth/signup?role=policyholder&source=lexiko_${entry.slug}`, language)}
                        className="pw-primary-button pw-btn-lg mt-5"
                    >
                        {t("Ανεβάστε το συμβόλαιό σας — δωρεάν σύνοψη", "Upload your policy — free summary")}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* FAQ */}
                {entry.faq.length > 0 && (
                    <section className="mt-12">
                        <h2 className="mb-5 text-h3 font-semibold tracking-tight text-[#0F172A] dark:text-white">
                            {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                        </h2>
                        <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                            {entry.faq.map((item, index) => (
                                <div key={index} className="py-5">
                                    <h3 className="mb-2 text-lead font-semibold text-[#0F172A] dark:text-slate-100">
                                        {item.question[lang]}
                                    </h3>
                                    <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                        {item.answer[lang]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Related */}
                {entry.related && entry.related.length > 0 && (
                    <section className="mt-12">
                        <h2 className="mb-4 text-body font-semibold uppercase tracking-widest text-[#5B6A7A] dark:text-slate-400">
                            {t("Σχετικά", "Related")}
                        </h2>
                        <div className="flex flex-col gap-2.5">
                            {entry.related.map((link, index) => (
                                <Link
                                    key={index}
                                    href={l(link.href)}
                                    className="group inline-flex items-center gap-2 text-body-lg font-medium text-[#29685B] dark:text-[#A7F3D0] hover:underline"
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                    {link.label[lang]}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Honesty line */}
                <p className="mt-12 flex items-start gap-2 text-body-sm leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    {t(
                        "Ενημερωτικό περιεχόμενο, όχι ασφαλιστική συμβουλή. Το PolicyWallet εξηγεί τι σημαίνει ο όρος και σας βοηθά να τον εντοπίσετε στο δικό σας έγγραφο — δεν βεβαιώνει τι καλύπτει το συμβόλαιό σας.",
                        "Educational content, not insurance advice. PolicyWallet explains what the term means and helps you find it in your own document — it does not assert what your policy covers."
                    )}
                </p>
            </article>
        </LoBPageShell>
    )
}
