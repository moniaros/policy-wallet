import React from "react"
import Link from "next/link"
import { CheckCircle2, TrendingUp, PieChart } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function GroupPensionProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ομαδικά Συνταξιοδοτικά", "Group Pension")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Εισφορές, εργοδοτική συμμετοχή, φόροι: όλα μετρημένα.", "Contributions, employer match, tax relief: all accounted for.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Παρακολουθήστε την απόδοση των επενδυτικών σας κεφαλαίων και υπολογίστε με ακρίβεια τις φορολογικές σας ελαφρύνσεις.", "Track your investment fund growth and accurately calculate your tax deductions in real-time.")}
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
                            {t("Πόση σύνταξη χτίζει το ομαδικό σας πρόγραμμα;", "How much pension is your group plan building?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Παρακολουθήστε λεπτομερώς τις εισφορές, τις εργοδοτικές συμμετοχές και την πορεία του συνταξιοδοτικού σας fund μέσα από την πλατφόρμα.", "Visualize your contributions, company-matching percentages, and pension fund performance continuously within the platform.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Φορολογικές Ελαφρύνσεις", "Tax Benefits")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Κρατήστε άμεσα στοιχεία για την εφορία. Δείτε πόσες κρατήσεις δικαιούστε από τα ομαδικά προγράμματα.", "Export exact premium contributions perfectly formulated for maximizing your income tax deductions.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Προβολές Συνταξιοδότησης", "Retirement Projections")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε πότε είναι η καλύτερη στιγμή εξόδου, βάσει ηλικίας και του συνολικού εταιρικού σωρευτικού λογαριασμού σας.", "Forecast your retirement runway and understand the exact vesting age and withdrawal penalties instantly.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[12px] border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Growth Fund Acct</h3>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">Matched 50%</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">€64,210</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">Total Vested</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">YTD Growth: +12.4%</div>
                                <TrendingUp className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-slate-50 text-slate-800 rounded-lg text-sm border border-slate-200">
                                <p className="font-bold flex items-center gap-2 mb-2"><PieChart className="w-4 h-4" /> Tax Deductible (2025)</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">€3,600 Eligible for submission</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="group-pension" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Δείτε τι χτίζει το ομαδικό σας πρόγραμμα.", "See what your group plan is building.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το ομαδικό συνταξιοδοτικό", "Upload your group pension plan")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
