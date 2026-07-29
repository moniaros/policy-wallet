import React from "react"
import Link from "next/link"
import { Activity, CheckCircle2, Users } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function GroupHealthProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ομαδική Υγεία", "Group Health Coverage")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Ομαδικό και ατομικό: μία εικόνα, χωρίς διπλοπληρωμές.", "Group and personal cover: one picture, no double-paying.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Οργανώστε τις παροχές του ομαδικού, συνδυάστε τις με την ατομική σας ασφάλιση και καλύψτε πλήρως τα εξαρτώμενα μέλη της οικογένειάς σας.", "Organize your group benefits, coordinate deeply with your personal insurance, and fully cover your family dependents.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white">
                            {t("Πληρώνετε διπλά για τις ίδιες καλύψεις;", "Are you double-paying for the same coverage?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Μην πληρώνετε διπλά γι' αυτό που ήδη σας παρέχει η εταιρεία σας. Συνδυάστε παροχές από το ομαδικό στο ατομικό συμβόλαιο.", "Stop double-paying for what your company already provides. We map your group benefits to find blind spots without overlapping premiums.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κάλυψη Οικογένειας", "Dependents Mapping")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε πού καλύπτονται τα παιδιά και τα μέλη της οικογένειας, ορίζοντας ξεκάθαρα τα όρια για αυτούς.", "See exactly where children and family members are covered under your corporate umbrella.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Συμπληρωματικές Παροχές", "Supplemental Deductibles")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Εκμεταλλευτείτε το ομαδικό σας συμβόλαιο για να μηδενίσετε τη δική σας προσωπική συμμετοχή εξόδων.", "Leverage your group policy to completely zero out the deductible on your personal medical plan.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Corporate Health</h3>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">Acme Corp Ltd</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">€40,000</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">Family Max Limit</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-red-50 dark:bg-rose-900/20 rounded-lg flex justify-between items-center border border-red-100 dark:border-rose-800/40">
                                <div className="font-medium text-red-900 dark:text-rose-200 text-sm">Dependent Covered: Emma</div>
                                <Users className="w-5 h-5 text-red-400" />
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <p className="font-bold flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> Personal Deductible Absorbed</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Group covers €1,500 / €1,500 of personal plan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="group-health" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Δείτε τι σας καλύπτει ήδη ο εργοδότης σας.", "See what your employer already covers.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το ομαδικό σας", "Upload your group policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
