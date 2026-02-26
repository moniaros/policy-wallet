"use client"

import React from "react"
import Link from "next/link"
import { Activity, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function HealthProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#EBE5D9] text-[#1A1A1A] px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase mb-6">
                        {t("Λύσεις Ζωής & Υγείας", "Life & Health Solutions")}
                    </span>
                    <h1 className="text-[46px] lg:text-[68px] leading-[1.05] tracking-[-0.04em] font-medium text-[#0F172A] mb-8">
                        {t("Έξυπνη διαχείριση ασφάλισης υγείας.", "Intelligent health coverage management.")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] lg:text-[22px] leading-[1.5] text-[#475569] mb-10">
                        {t("Ελέγξτε τις εξωνοσοκομειακές δαπάνες σας (Out-of-Pocket Max), επαληθεύστε τα κέντρα συντονισμού και μειώστε το ιατρικό σας ρίσκο αυτόματα.", "Manage your out-of-pocket maximums, verify direct-billing coordination centers, and minimize medical exposure automatically.")}
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
                            {t("Διαύγεια στο χάος της νοσηλείας", "Clarity in healthcare chaos")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed mb-8">
                            {t("Μεταφράζουμε τα ψιλά γράμματα των συμβολαίων Υγείας σε ξεκάθαρα, γραφικά όρια κάλυψης (Radial Charts). Δεν αναρωτιέστε πια τι καλύπτεται.", "We translate deeply complex life and health condition clauses into visual radial boundaries, eliminating second-guessing.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Κέντρα Συντονισμού", "Coordination Centers")}</h4>
                                    <p className="text-[#475569]">{t("Άμεση πρόσβαση στο δίκτυο απευθείας χρέωσης (Direct Billing) για το νοσοκομείο σας. Τέλος τα τηλέφωνα έκτακτης ανάγκης.", "Instant access links to your specific hospital direct-billing networks so your admission triggers no out-of-pocket holds.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Μέγιστο Ποσό Ιδίας Συμμετοχής", "Out-of-Pocket Trackers")}</h4>
                                    <p className="text-[#475569]">{t("Οπτικοποιήστε το Max Out-of-Pocket του πακέτου σας για να ελέγχετε με ακρίβεια τον προϋπολογισμό των δαπανών υγείας σας.", "Visualize your Max Out-of-Pocket boundaries cleanly so you know exactly when 100% network coverage initiates.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white p-8 rounded-[12px] border border-[#E5E5E5] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-wider">Premium Health</h3>
                                <p className="text-[13px] text-emerald-600 font-medium mt-1">Active</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[20px] font-medium text-[#1A1A1A]">€1M</div>
                                <p className="text-[13px] text-gray-500">Annual Limit</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 rounded-lg flex justify-between items-center border border-blue-100">
                                <div className="font-medium text-blue-900 text-sm">Out-of-pocket max: €1,500</div>
                            </div>
                            <div className="p-4 bg-slate-50 text-slate-800 rounded-lg text-sm border border-slate-200">
                                <p className="font-bold flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> Authorized Networks</p>
                                <p className="text-xs text-slate-500">Direct Billing Enabled (MedNetwork Systems)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-[#1A1C1D] text-white py-24 text-center px-6">
                <h2 className="text-[36px] lg:text-[48px] font-medium tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Ασφαλίστε την υγεία σας έξυπνα.", "Intelligent health data in your pocket.")}
                </h2>
                <Link href="/auth/signup" className="inline-flex rounded-[4px] bg-[#89D9B2] px-8 py-4 text-[16px] font-bold text-[#1A1A1A] transition-opacity duration-150 hover:opacity-90">
                    {t("Ξεκινήστε τώρα", "Start organizing today")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
