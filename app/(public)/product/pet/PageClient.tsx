import React from "react"
import Link from "next/link"
import { Heart, ShieldAlert, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function PetProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] text-[#166534] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Λύσεις Ζώων Συντροφιάς", "Pet Solutions")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] mb-8">
                        {t("Οι εξαιρέσεις του κατοικιδίου σας, στο φως.", "Your pet policy's exclusions, out in the open.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] mb-10">
                        {t("Διαγνώστε εξαιρούμενες προϋπάρχουσες παθήσεις, συγκρίνετε ετήσια όρια και ελέγξτε κάλυψη Leishmania (Καλαζάρ) πριν υπογράψετε.", "Diagnose excluded pre-existing conditions, cross-check annual limits, and verify specialized Mediterranean coverages (Leishmaniasis) proactively.")}
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
                <div className="mx-auto max-w-page grid md:grid-cols-2 gap-16 items-center">
                    {/* Mock UI — left on desktop */}
                    <div className="order-last md:order-first bg-white p-8 rounded-[12px] border border-[#E2E8F0] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] uppercase tracking-wider">Golden Retriever</h3>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">Age: 4 · Active Cover</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-[#F0FDF4] rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] text-sm">Leishmania Covered</div>
                                <Heart className="w-5 h-5 text-[#29685B]" />
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
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A]">
                            {t("Τι εξαιρεί η ασφάλεια του κατοικιδίου σας;", "What does your pet insurance exclude?")}
                        </h2>
                        <p className="text-[#475569] text-lead leading-relaxed mb-8">
                            {t("Οι ασφάλειες κατοικίδιων είναι διαβόητες για τις κρυφές εξαιρέσεις. Το σύστημα μας εξάγει τα Radar Charts παθήσεων σε ένα δευτερόλεπτο.", "Pet insurance is notorious for dense clause exclusions. We extract them instantly into Breed Condition Radar Charts.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A]">{t("Κάλυψη Καλαζάρ (Leishmania)", "Mediterranean Vector Coverage")}</h4>
                                    <p className="text-[#475569]">{t("Αυτόματος έλεγχος αν η ασφάλεια σας περιλαμβάνει την κρίσιμη θεραπεία για τις μεσογειακές νόσους.", "Automated verification targeting explicitly expensive vector diseases like Leishmania.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A]">{t("Εξαιρέσεις & Radar Charts", "Condition Radar Visualisation")}</h4>
                                    <p className="text-[#475569]">{t("Δείτε συγκεντρωτικά ποιες γενετικές ή προ-υπάρχουσες εξαιρέσεις βαραίνουν το συμβόλαιο σας.", "Aggregated visual representations of genetic or pre-existing exclusions mapped against your specific breed.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="pet" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Μάθετε τι καλύπτεται πριν τον κτηνίατρο.", "Know what's covered before the vet visit.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο του κατοικιδίου", "Upload your pet policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
