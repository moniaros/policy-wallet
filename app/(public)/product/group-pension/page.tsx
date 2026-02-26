"use client"

import React from "react"
import Link from "next/link"
import { CheckCircle2, TrendingUp, PieChart } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function GroupPensionProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#E7EDD7] text-[#1A1A1A] px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase mb-6">
                        {t("Ομαδικά Συνταξιοδοτικά", "Group Pension")}
                    </span>
                    <h1 className="text-[46px] lg:text-[68px] leading-[1.05] tracking-[-0.04em] font-medium text-[#0F172A] mb-8">
                        {t("Χτίστε το μέλλον σας με σιγουριά.", "Build your financial future effortlessly.")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] lg:text-[22px] leading-[1.5] text-[#475569] mb-10">
                        {t("Παρακολουθήστε την απόδοση των επενδυτικών σας κεφαλαίων και υπολογίστε με ακρίβεια τις φορολογικές σας ελαφρύνσεις.", "Track your investment fund growth and accurately calculate your tax deductions in real-time.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="w-full sm:w-auto rounded-[4px] bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors duration-150 hover:bg-[#1C4E44]">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC]">
                <div className="mx-auto max-w-[1240px] grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-[36px] font-medium tracking-[-0.03em] mb-6 leading-[1.1] text-[#1A1A1A]">
                            {t("Αποταμίευση που αποδίδει", "Investments that deliver")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed mb-8">
                            {t("Παρακολουθήστε λεπτομερώς τις εισφορές, τις εργοδοτικές συμμετοχές και την πορεία του συνταξιοδοτικού σας fund μέσα από την πλατφόρμα.", "Visualize your contributions, company-matching percentages, and pension fund performance continuously within the platform.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Φορολογικές Ελαφρύνσεις", "Tax Benefits")}</h4>
                                    <p className="text-[#475569]">{t("Κρατήστε άμεσα στοιχεία για την εφορία. Δείτε πόσες κρατήσεις δικαιούστε από τα ομαδικά προγράμματα.", "Export exact premium contributions perfectly formulated for maximizing your income tax deductions.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Προβολές Συνταξιοδότησης", "Retirement Projections")}</h4>
                                    <p className="text-[#475569]">{t("Δείτε πότε είναι η καλύτερη στιγμή εξόδου, βάσει ηλικίας και του συνολικού εταιρικού σωρευτικού λογαριασμού σας.", "Forecast your retirement runway and understand the exact vesting age and withdrawal penalties instantly.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white p-8 rounded-[12px] border border-[#E5E5E5] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-wider">Growth Fund Acct</h3>
                                <p className="text-[13px] text-emerald-600 font-medium mt-1">Matched 50%</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[20px] font-medium text-[#1A1A1A]">€64,210</div>
                                <p className="text-[13px] text-gray-500">Total Vested</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-emerald-50 rounded-lg flex justify-between items-center border border-emerald-100">
                                <div className="font-medium text-emerald-900 text-sm">YTD Growth: +12.4%</div>
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="p-4 bg-slate-50 text-slate-800 rounded-lg text-sm border border-slate-200">
                                <p className="font-bold flex items-center gap-2 mb-2"><PieChart className="w-4 h-4" /> Tax Deductible (2025)</p>
                                <p className="text-xs text-slate-500">€3,600 Eligible for submission</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-[#1A1C1D] text-white py-24 text-center px-6">
                <h2 className="text-[36px] lg:text-[48px] font-medium tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Κάντε τον προγραμματισμό εύκολο.", "Make financial planning effortless")}
                </h2>
                <Link href="/auth/signup" className="inline-flex rounded-[4px] bg-[#89D9B2] px-8 py-4 text-[16px] font-bold text-[#1A1A1A] transition-opacity duration-150 hover:opacity-90">
                    {t("Ξεκινήστε τώρα", "Start organizing today")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
