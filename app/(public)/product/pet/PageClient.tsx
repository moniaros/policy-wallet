import React from "react"
import Link from "next/link"
import { Heart, ShieldAlert, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function PetProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ζώα συντροφιάς", "Pets")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Οι εξαιρέσεις του κατοικιδίου σας, στο φως.", "Your pet policy's exclusions, out in the open.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε ποιες παθήσεις εξαιρούνται, συγκρίνετε τα ετήσια όρια και ελέγξτε αν καλύπτεται η λεϊσμανίαση — πριν το χρειαστείτε.", "See which conditions are excluded, compare the yearly limits, and check whether leishmaniasis is covered — before you need it.")}
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
                    {/* Mock UI — left on desktop */}
                    <div className="order-last md:order-first bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Γκόλντεν Ριτρίβερ", "Golden Retriever")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Ηλικία: 4 · Ενεργή κάλυψη", "Age: 4 · Cover active")}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">{t("Καλύπτεται η λεϊσμανίαση", "Leishmaniasis covered")}</div>
                                <Heart className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex justify-between border border-rose-100 dark:border-rose-800/40">
                                <div>
                                    <p className="font-medium text-rose-900 dark:text-rose-200 text-sm flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" /> {t("Εξαιρούμενες παθήσεις", "Excluded conditions")}
                                    </p>
                                    <p className="text-xs text-rose-700 dark:text-rose-200 mt-1">{t("- Δυσπλασία ισχίου (προϋπάρχουσα)", "- Hip dysplasia (pre-existing)")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Τι εξαιρεί η ασφάλεια του κατοικιδίου σας;", "What does your pet insurance exclude?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Οι ασφάλειες κατοικιδίων έχουν πολλές εξαιρέσεις. Τις βγάζουμε όλες στο φως, με τα ονόματα των παθήσεων.", "Pet insurance has many exclusions. We bring them all to light, with the names of the conditions.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κάλυψη για λεϊσμανίαση", "Leishmaniasis cover")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Ελέγχουμε αν η ασφάλειά σας καλύπτει τη θεραπεία για τη λεϊσμανίαση και τις άλλες μεσογειακές νόσους.", "We check whether your policy covers treatment for leishmaniasis and other Mediterranean diseases.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Ποιες παθήσεις εξαιρούνται", "Which conditions are excluded")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε συγκεντρωτικά ποιες γενετικές ή προϋπάρχουσες εξαιρέσεις βαραίνουν το συμβόλαιό σας.", "See in one place which genetic or pre-existing exclusions weigh on your policy.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="pet" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="pet" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Μάθετε τι καλύπτεται πριν τον κτηνίατρο.", "Know what's covered before the vet visit.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο του κατοικιδίου", "Upload your pet policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
