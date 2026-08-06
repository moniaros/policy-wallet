import React from "react"
import Link from "next/link"
import { HeartHandshake, ShieldAlert, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function LifeProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ασφάλεια ζωής", "Life insurance")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Αρκεί το κεφάλαιο για τους δικούς σας;", "Would the payout be enough for your loved ones?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Υπόλοιπο στεγαστικού, έξοδα οικογένειας, σπουδές παιδιών: βάλτε το κεφάλαιο κάλυψης δίπλα στις πραγματικές σας υποχρεώσεις και δείτε αν στέκει.", "Outstanding mortgage, family expenses, children's education: place your coverage amount next to your real obligations and see if it holds up.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε τον δωρεάν έλεγχο", "Start your free check")}
                        </Link>
                    </div>
                    <p className="mt-3 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                        {t("Δωρεάν για 1 συμβόλαιο. Χωρίς κάρτα.", "Free for 1 policy. No card.")}
                    </p>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Το συμβόλαιο ζωής δεν είναι «ένα χαρτί στο συρτάρι».", "A life policy is not just paper in a drawer.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Παροχή θανάτου, μόνιμη αναπηρία, σοβαρές ασθένειες, προστασία δανείου — τέσσερα σκέλη που συχνά αγοράστηκαν πριν χρόνια και δεν ξαναδιαβάστηκαν ποτέ. Τα ξεχωρίζουμε και σας τα εξηγούμε ένα προς ένα.", "Death benefit, permanent disability, serious illness, mortgage protection — four components often bought years ago and never re-read. We separate them and explain each one to you.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κεφάλαιο σε σχέση με τις υποχρεώσεις", "Cover against what you owe")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Ένα κεφάλαιο που ορίστηκε όταν το στεγαστικό ήταν στην αρχή του μπορεί σήμερα να μην καλύπτει ούτε το υπόλοιπο του δανείου.", "A sum insured set when your mortgage was new may no longer cover even the remaining loan balance today.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Σοβαρές ασθένειες & αναπηρία", "Serious illness & disability")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε αν οι συμπληρωματικές καλύψεις πληρώνουν όσο ζείτε — ή μόνο μετά. Η διαφορά κρίνει το εισόδημα της οικογένειας.", "See whether supplementary covers pay while you are alive — or only after. That difference decides your family's income.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Δικαιούχοι με μία ματιά", "Who gets paid, at a glance")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Ποιος εισπράττει, με ποια σειρά και υπό ποιους όρους — καταγεγραμμένα καθαρά, όχι θαμμένα στη σελίδα 14.", "Who receives the benefit, in what order and under which terms — recorded clearly, not buried on page 14.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Προστασία οικογένειας", "Family protection")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Πρόσκαιρη ζωής · 2 εξαρτώμενοι", "Term life · 2 dependents")}</p>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569] dark:text-slate-300">{t("Κάλυψη σε σχέση με το υπόλοιπο του δανείου", "Cover against what is left on the mortgage")}</span>
                                    <span className="font-medium text-amber-700 dark:text-amber-300">{t("Βρέθηκε κενό", "Gap found")}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full">
                                    <div className="bg-amber-500 w-[72%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">{t("Περιλαμβάνονται σοβαρές ασθένειες", "Serious illness included")}</div>
                                <HeartHandshake className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex justify-between border border-rose-100 dark:border-rose-800/40">
                                <div>
                                    <p className="font-medium text-rose-900 dark:text-rose-200 text-sm flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" /> {t("Λείπει κάλυψη", "Missing cover")}
                                    </p>
                                    <p className="text-xs text-rose-700 dark:text-rose-200 mt-1">{t("- Μόνιμη αναπηρία", "- Permanent disability")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="life" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="life" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Δώστε στην οικογένειά σας απαντήσεις, όχι ερωτηματικά.", "Give your family answers, not question marks.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο ζωής σας", "Upload your life policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
