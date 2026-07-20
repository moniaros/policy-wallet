"use client"

import React from "react"
import Link from "next/link"
import { PiggyBank, CheckCircle2, AlertTriangle } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function PensionProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#E7EDD7] text-[#1A1A1A] px-3 py-1 rounded-full text-[12px] font-semibold tracking-wider uppercase mb-6">
                        {t("Σύνταξη & Αποταμίευση", "Pension & Savings")}
                    </span>
                    <h1 className="text-[44px] lg:text-[56px] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] mb-8">
                        {t("Ξέρετε τι υπογράψατε για τη σύνταξή σας;", "Do you know what you signed for your retirement?")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] leading-[1.5] text-[#475569] mb-10">
                        {t("Τα αποταμιευτικά και συνταξιοδοτικά προγράμματα είναι δεσμεύσεις δεκαετιών με εισφορές, όρους ωρίμανσης και ρήτρες εξαγοράς. Η AI τα μεταφράζει σε καθαρή εικόνα: τι πληρώνετε, τι χτίζετε, τι χάνετε αν σταματήσετε.", "Savings and pension plans are decade-long commitments with contributions, maturity terms and surrender clauses. Our AI turns them into a clear picture: what you pay, what you build, and what you lose if you stop.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC]">
                <div className="mx-auto max-w-[1240px] grid md:grid-cols-2 gap-16 items-center">
                    {/* Mock UI — left on desktop */}
                    <div className="order-last md:order-first bg-white p-8 rounded-[12px] border border-[#E5E5E5] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-wider">Savings Plan</h3>
                                <p className="text-[13px] text-gray-500">Monthly Contributions · Year 8 of 25</p>
                            </div>
                            <PiggyBank className="w-6 h-6 text-[#29685B]" />
                        </div>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569]">Progress to Maturity</span>
                                    <span className="font-medium">32%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full">
                                    <div className="bg-[#29685B] w-[32%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#29685B]/20">
                                <p className="font-medium text-[#166534] text-sm">Maturity Options: Lump Sum / Annuity</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-amber-900 text-sm">Early Surrender Penalty</p>
                                    <p className="text-xs text-amber-700 mt-1">Applies before year 10 — see terms</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-[32px] font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#1A1A1A]">
                            {t("Η δημόσια σύνταξη είναι το ένα σκέλος. Το δικό σας πρόγραμμα είναι το άλλο.", "The state pension is one leg. Your own plan is the other.")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed mb-8">
                            {t("Όσοι χτίζουν συμπληρωματικό εισόδημα για τη σύνταξη πρέπει να ξέρουν ακριβώς πώς δουλεύει το πρόγραμμά τους — γιατί οι όροι που θα κρίνουν το αποτέλεσμα γράφτηκαν την ημέρα της υπογραφής.", "If you are building supplementary retirement income, you need to know exactly how your plan works — because the terms that decide the outcome were written on signing day.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-semibold text-[#1A1A1A]">{t("Εφάπαξ ή σύνταξη;", "Lump sum or annuity?")}</h4>
                                    <p className="text-[#475569]">{t("Οι επιλογές ωρίμανσης καθορίζουν αν στη λήξη παίρνετε ένα ποσό ή μηνιαίο εισόδημα. Δείτε τις δικές σας πριν πλησιάσει η ημερομηνία.", "Maturity options decide whether you receive a single amount or monthly income at term. See yours long before the date approaches.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-semibold text-[#1A1A1A]">{t("Όροι εξαγοράς στο φως", "Surrender terms in the open")}</h4>
                                    <p className="text-[#475569]">{t("Η πρόωρη διακοπή έχει κόστος που ελάχιστοι έχουν διαβάσει. Η AI εντοπίζει τη ρήτρα εξαγοράς και σας δείχνει τι σημαίνει στην πράξη.", "Stopping early has a cost that few people have actually read. The AI locates the surrender clause and shows what it means in practice.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-semibold text-[#1A1A1A]">{t("Εγγυημένο ή επενδυτικό σκέλος", "Guaranteed vs investment component")}</h4>
                                    <p className="text-[#475569]">{t("Ποιο μέρος της αποταμίευσής σας είναι εγγυημένο και ποιο ακολουθεί την αγορά; Η διάκριση είναι κρίσιμη — και συχνά ασαφής στο συμβόλαιο.", "Which part of your savings is guaranteed and which follows the market? The distinction is critical — and often unclear in the contract.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="pension" />

            {/* CTA */}
            <section className="bg-[#1A1C1D] text-white py-24 text-center px-6">
                <h2 className="text-[32px] lg:text-[44px] font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Δεκαετίες αποταμίευσης αξίζουν πέντε λεπτά ανάλυσης.", "Decades of saving deserve five minutes of analysis.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-inverse pw-btn-lg">
                    {t("Αναλύστε το πρόγραμμά σας", "Analyze your plan")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
