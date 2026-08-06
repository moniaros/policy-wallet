import React from "react"
import Link from "next/link"
import { Shield, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function CyberProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Κυβερνοασφάλεια", "Cyber insurance")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Ransomware, διακοπή λειτουργίας, ευθύνη: τι σας καλύπτει;", "Ransomware, downtime, liability: what covers you?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε τι καλύπτεται αν κλειδώσουν τα δεδομένα σας, μέχρι ποιο ποσό, και πόσο πληρώνεστε για κάθε μέρα που η δουλειά σταματά.", "See what is covered if your data is locked, up to what amount, and how much you are paid for every day the business stops.")}
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
                            {t("Αν χτυπήσει επίθεση, ξέρετε ήδη τι ισχύει;", "If an attack hits, do you already know what applies?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Σε περίπτωση παραβίασης, ο χρόνος είναι χρήμα. Το PolicyWallet κρατά τα στοιχεία της ομάδας άμεσης επέμβασης πάντα διαθέσιμα.", "In a breach, time is money. PolicyWallet keeps the details of your incident response team always at hand.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κάλυψη Ransomware", "Ransomware cover")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Σας δείχνουμε τι ακριβώς πληρώνει το συμβόλαιο σε εκβιασμό ή απώλεια δεδομένων.", "We show you exactly what the policy pays in extortion or data loss.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Απώλεια κερδών", "Loss of profits")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε τα χρονικά όρια αποζημίωσης σε περίπτωση που η επιχείρηση σταματήσει να λειτουργεί λόγω κυβερνοεπίθεσης.", "See the time limits on compensation if the business stops operating because of a cyber attack.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Κυβερνοασφάλεια επιχείρησης", "Business cyber cover")}</p>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">{t("Ενεργό", "Active")}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">{t("2,5 εκατ. €", "€2.5M")}</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Συνολικό όριο", "Total limit")}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex justify-between items-center border border-purple-100 dark:border-purple-800/40">
                                <div className="font-medium text-purple-900 dark:text-purple-200 text-sm">{t("Όριο εκβιασμού: 500.000 €", "Extortion limit: €500k")}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <p className="font-bold flex items-center gap-2 mb-2"><Shield className="w-4 h-4" /> {t("Ομάδα άμεσης επέμβασης: εξωτερικός συνεργάτης", "Response team: external partner")}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("Χρόνος αναμονής: 12 ώρες", "Waiting period: 12 hours")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="cyber" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="cyber" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Μάθετε τι ισχύει πριν συμβεί.", "Find out what applies before it happens.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο κυβερνοασφάλειας", "Upload your cyber policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
