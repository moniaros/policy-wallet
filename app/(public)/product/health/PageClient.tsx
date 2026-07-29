import React from "react"
import Link from "next/link"
import { Activity, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function HealthProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Λύσεις Ζωής & Υγείας", "Life & Health Solutions")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Νοσήλια, δίκτυα, συμμετοχές — σε απλά ελληνικά.", "Hospital cover, networks, out-of-pocket — in plain language.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Ελέγξτε τις εξωνοσοκομειακές δαπάνες σας (Out-of-Pocket Max), επαληθεύστε τα κέντρα συντονισμού και μειώστε το ιατρικό σας ρίσκο αυτόματα.", "Manage your out-of-pocket maximums, verify direct-billing coordination centers, and minimize medical exposure automatically.")}
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
                            {t("Τι καλύπτει το συμβόλαιο υγείας σας;", "What does your health policy cover?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Μεταφράζουμε τα ψιλά γράμματα των συμβολαίων Υγείας σε ξεκάθαρα, γραφικά όρια κάλυψης (Radial Charts). Δεν αναρωτιέστε πια τι καλύπτεται.", "We translate deeply complex life and health condition clauses into visual radial boundaries, eliminating second-guessing.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κέντρα Συντονισμού", "Coordination Centers")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Άμεση πρόσβαση στο δίκτυο απευθείας χρέωσης (Direct Billing) για το νοσοκομείο σας. Τέλος τα τηλέφωνα έκτακτης ανάγκης.", "Instant access links to your specific hospital direct-billing networks so your admission triggers no out-of-pocket holds.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Μέγιστο Ποσό Ιδίας Συμμετοχής", "Out-of-Pocket Trackers")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Οπτικοποιήστε το Max Out-of-Pocket του πακέτου σας για να ελέγχετε με ακρίβεια τον προϋπολογισμό των δαπανών υγείας σας.", "Visualize your Max Out-of-Pocket boundaries cleanly so you know exactly when 100% network coverage initiates.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Premium Health</h3>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">Active</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">€1M</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">Annual Limit</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center border border-blue-100 dark:border-blue-800/40">
                                <div className="font-medium text-blue-900 dark:text-blue-200 text-sm">Out-of-pocket max: €1,500</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <p className="font-bold flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> Authorized Networks</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Direct Billing Enabled (MedNetwork Systems)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="health" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Μάθετε τι πληρώνει το συμβόλαιο υγείας σας.", "Know what your health policy pays.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο υγείας", "Upload your health policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
