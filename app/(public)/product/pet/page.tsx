"use client"

import React from "react"
import Link from "next/link"
import { Heart, ShieldAlert, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function PetProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#D7E4ED] text-[#1A1A1A] px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase mb-6">
                        {t("Λύσεις Ζώων Συντροφιάς", "Pet Solutions")}
                    </span>
                    <h1 className="text-[46px] lg:text-[68px] leading-[1.05] tracking-[-0.04em] font-medium text-[#0F172A] mb-8">
                        {t("Μηδενίστε τα κρυφά παραθυράκια συμβολαίων.", "Nullify hidden contract loopholes.")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] lg:text-[22px] leading-[1.5] text-[#475569] mb-10">
                        {t("Διαγνώστε εξαιρούμενες προϋπάρχουσες παθήσεις, συγκρίνετε ετήσια όρια και ελέγξτε κάλυψη Leishmania (Καλαζάρ) πριν υπογράψετε.", "Diagnose excluded pre-existing conditions, cross-check annual limits, and verify specialized Mediterranean coverages (Leishmaniasis) proactively.")}
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
                    {/* Mock UI — left on desktop */}
                    <div className="order-last md:order-first bg-white p-8 rounded-[12px] border border-[#E5E5E5] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-wider">Golden Retriever</h3>
                                <p className="text-[13px] text-gray-500">Age: 4 · Active Cover</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-lg flex justify-between items-center border border-emerald-100">
                                <div className="font-medium text-emerald-900 text-sm">Leishmania Covered</div>
                                <Heart className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="p-4 bg-rose-50 rounded-lg flex justify-between border border-rose-100">
                                <div>
                                    <p className="font-medium text-rose-900 text-sm flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" /> Excluded Conditions
                                    </p>
                                    <p className="text-xs text-rose-700 mt-1">- Hip Dysplasia (Pre-existing)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-[36px] font-medium tracking-[-0.03em] mb-6 leading-[1.1] text-[#1A1A1A]">
                            {t("Διαβάστε πίσω από τα ψιλά γράμματα", "Read strictly behind the fine print")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed mb-8">
                            {t("Οι ασφάλειες κατοικίδιων είναι διαβόητες για τις κρυφές εξαιρέσεις. Το σύστημα μας εξάγει τα Radar Charts παθήσεων σε ένα δευτερόλεπτο.", "Pet insurance is notorious for dense clause exclusions. We extract them instantly into Breed Condition Radar Charts.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Κάλυψη Καλαζάρ (Leishmania)", "Mediterranean Vector Coverage")}</h4>
                                    <p className="text-[#475569]">{t("Αυτόματος έλεγχος αν η ασφάλεια σας περιλαμβάνει την κρίσιμη θεραπεία για τις μεσογειακές νόσους.", "Automated verification targeting explicitly expensive vector diseases like Leishmania.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Εξαιρέσεις & Radar Charts", "Condition Radar Visualisation")}</h4>
                                    <p className="text-[#475569]">{t("Δείτε συγκεντρωτικά ποιες γενετικές ή προ-υπάρχουσες εξαιρέσεις βαραίνουν το συμβόλαιο σας.", "Aggregated visual representations of genetic or pre-existing exclusions mapped against your specific breed.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="pet" />

            {/* CTA */}
            <section className="bg-[#1A1C1D] text-white py-24 text-center px-6">
                <h2 className="text-[36px] lg:text-[48px] font-medium tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Κερδίστε πλεονέκτημα στην ιατρική περίθαλψη.", "Gain the upper hand in veterinary care.")}
                </h2>
                <Link href="/auth/signup" className="inline-flex rounded-[4px] bg-[#89D9B2] px-8 py-4 text-[16px] font-bold text-[#1A1A1A] transition-opacity duration-150 hover:opacity-90">
                    {t("Ξεκινήστε τώρα", "Start organizing today")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
