import React from "react"
import Link from "next/link"
import { Shield, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function PropertyProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Λύσεις Ακινήτων", "Property Solutions")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Το σπίτι σας, ασφαλισμένο στη σωστή αξία.", "Your home, insured at the right value.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Διασφαλίστε το Rebuild Cost, αναλύστε καλύψεις φυσικών καταστροφών και ελέγξτε αν δικαιούστε την έκπτωση ΕΝΦΙΑ, σε μία πλατφόρμα.", "Ensure adequate Rebuild Costs, analyze strictly natural disaster coverages, and automate ENFIA tax-discount eligibility checks.")}
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
                    {/* Mock UI — left on desktop */}
                    <div className="order-last md:order-first bg-white dark:bg-slate-900 p-8 rounded-[12px] border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Primary Residence</h3>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">120 sq.m — Athens</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569] dark:text-slate-300">Rebuild Cost Threshold</span>
                                    <span className="font-medium text-amber-700">Underinsured by 15%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full">
                                    <div className="bg-amber-500 w-[85%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-purple-900 text-sm">ENFIA discount</p>
                                    <p className="text-xs text-purple-700 mt-1">Missing Flood Coverage</p>
                                </div>
                                <Shield className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white">
                            {t("Είναι το σπίτι σας πραγματικά ασφαλισμένο;", "Is your home actually covered?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Η έξυπνη ανάλυση μας εξάγει κάθε κρίσιμο όρο ασφάλισης σπιτιού και κατασκευής, διασφαλίζοντας ότι το σπίτι σας (και η τσέπη σας) είναι ασφαλή.", "Our intelligent parsing extracts every critical home and structure condition, ensuring your property (and your wallet) are actually protected.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κλείδωμα Κόστους Ανακατασκευής", "Rebuild Cost Guard")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Σύγκριση της αξίας σας απέναντι στον πραγματικό πληθωρισμό υλικών πριν η ασφαλιστική πληρώσει λιγότερα.", "Pinpoint gaps where inflation outpaced your total rebuild coverage before catastrophe strikes.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Έκπτωση ΕΝΦΙΑ (Ελλάδα)", "ENFIA tax discount (GR)")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Οπτικός έλεγχος αν έχετε την απαραίτητη τριάδα Σεισμού-Πυρκαγιάς-Πλημμύρας για την έκπτωση ΕΝΦΙΑ έως 20%.", "Visual checks parsing for the required trio of Earthquake, Fire, and Flood for the ENFIA tax discount of up to 20%.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Μένετε με ενοίκιο;", "Renting your home?")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Η ασφάλεια κατοικίας δεν αφορά μόνο ιδιοκτήτες: το περιεχόμενο και η ευθύνη ενοικιαστή αναλύονται με τον ίδιο τρόπο, ώστε να ξέρετε τι σας προστατεύει μέσα στο σπίτι που νοικιάζετε.", "Home insurance isn't only for owners: contents and tenant liability are analyzed the same way, so you know what protects you inside the home you rent.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="property" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Ασφαλίστε την περιουσία σας σωστά.", "Protect your equity correctly.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο κατοικίας", "Upload your home policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
