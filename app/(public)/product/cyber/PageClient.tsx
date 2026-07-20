"use client"

import React from "react"
import Link from "next/link"
import { Shield, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function CyberProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#DCEBDA] text-[#166534] px-3 py-1 rounded-full text-[12px] font-semibold tracking-wider uppercase mb-6">
                        {t("Κυβερνοασφάλεια", "Cyber Risk Solutions")}
                    </span>
                    <h1 className="text-[44px] lg:text-[56px] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] mb-8">
                        {t("Ransomware, διακοπή λειτουργίας, ευθύνη: τι σας καλύπτει;", "Ransomware, downtime, liability: what covers you?")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] leading-[1.5] text-[#475569] mb-10">
                        {t("Ελέγξτε τις καλύψεις σας για ransomware, ενημερωθείτε για τα όρια άμεσης ανταπόκρισης και παρακολουθήστε την ασφάλεια των συστημάτων σας.", "Validate ransomware protection, track incident response limits, and document downtime coverage precisely.")}
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
                    <div>
                        <h2 className="text-[32px] font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A]">
                            {t("Είστε έτοιμοι για ένα κυβερνοσυμβάν;", "Are you ready for a cyber incident?")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed mb-8">
                            {t("Σε περίπτωση παραβίασης, ο χρόνος είναι χρήμα. Το PolicyWallet διατηρεί τα στοιχεία της ομάδας άμεσης επέμβασης άμεσα προσβάσιμα.", "In a breach, time is money. PolicyWallet keeps your emergency incident response team details one tap away.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-semibold text-[#0F172A]">{t("Κάλυψη Ransomware", "Ransomware Validation")}</h4>
                                    <p className="text-[#475569]">{t("Αναλύστε την ακριβή υποστήριξη που παρέχει το ασφαλιστήριό σας σε περιπτώσεις εκβιασμού και απώλειας δεδομένων.", "Analyze exactly what your policy covers regarding extortion, ransom payments, and data recreation costs.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-semibold text-[#0F172A]">{t("Απώλεια κερδών (BI)", "Business Interruption (BI)")}</h4>
                                    <p className="text-[#475569]">{t("Παρακολουθήστε τα χρονικά όρια αποζημίωσης σε περίπτωση που η επιχείρηση σταματήσει να λειτουργεί λόγω κυβερνοεπίθεσης.", "Monitor the indemnity period and waiting hours before your business interruption coverage triggers.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white p-8 rounded-[12px] border border-[#E2E8F0] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider">Cyber Enterprise</h3>
                                <p className="text-[13px] text-[#166534] font-medium mt-1">Active</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[20px] font-medium text-[#0F172A]">€2.5M</div>
                                <p className="text-[13px] text-gray-500">Aggregate Limit</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-purple-50 rounded-lg flex justify-between items-center border border-purple-100">
                                <div className="font-medium text-purple-900 text-sm">Extortion Limit: €500k</div>
                            </div>
                            <div className="p-4 bg-slate-50 text-slate-800 rounded-lg text-sm border border-slate-200">
                                <p className="font-bold flex items-center gap-2 mb-2"><Shield className="w-4 h-4" /> Incident Team: Deloitte Sec</p>
                                <p className="text-xs text-slate-500">Waiting period: 12 Hours</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="cyber" />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-[32px] lg:text-[44px] font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Μάθετε τι ισχύει πριν το συμβάν.", "Know what applies before the incident.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-inverse pw-btn-lg">
                    {t("Ανεβάστε το cyber συμβόλαιο", "Upload your cyber policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
