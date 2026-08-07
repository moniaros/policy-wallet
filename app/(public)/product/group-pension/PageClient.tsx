import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { CheckCircle2, TrendingUp, PieChart } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function GroupPensionProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ομαδικά συνταξιοδοτικά", "Group pension")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Εισφορές, εργοδοτική συμμετοχή, φόροι: όλα μετρημένα.", "Contributions, employer match, taxes: all accounted for.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε πόσα έχουν μαζευτεί, πόσα βάζει η εταιρεία και ποιο ποσό μπορείτε να δηλώσετε στη φορολογική σας δήλωση.", "See how much has built up, how much the company adds, and what amount you can put on your tax return.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={authHref("/auth/signup", locale)} className="pw-primary-button pw-btn-lg w-full sm:w-auto">
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
                            {t("Πόση σύνταξη χτίζει το ομαδικό σας πρόγραμμα;", "How much pension is your group plan building?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Δείτε καθαρά τις εισφορές σας, τη συμμετοχή του εργοδότη και το ποσό που έχει συγκεντρωθεί — κατευθείαν από τα έγγραφα του προγράμματός σας.", "Get a clear view of your contributions, the employer's share, and the amount built up — straight from your plan documents.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Φορολογικές ελαφρύνσεις", "Tax relief")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Έχετε έτοιμα τα στοιχεία για την εφορία. Δείτε ποιες εκπτώσεις φόρου δικαιούστε από τα ομαδικά προγράμματα.", "Have the figures ready for the tax office. See which tax deductions your group plans entitle you to.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Τι ισχύει όταν αποχωρήσετε", "What applies when you leave")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε τι γράφει το πρόγραμμά σας για την αποχώρηση: σε ποια ηλικία το ποσό γίνεται δικό σας και τι ισχύει αν φύγετε νωρίτερα.", "See what your plan says about leaving: at what age the amount becomes yours, and what applies if you leave earlier.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Ταμείο ανάπτυξης", "Growth fund")}</p>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">{t("Η εταιρεία βάζει 50%", "The company adds 50%")}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">{t("64.210 €", "€64,210")}</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Σύνολο που σας ανήκει", "Total that is yours")}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">{t("Εγγυημένο επιτόκιο: 2,0%", "Guaranteed rate: 2.0%")}</div>
                                <TrendingUp className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <p className="font-bold flex items-center gap-2 mb-2"><PieChart className="w-4 h-4" /> {t("Εκπίπτει από τον φόρο (2025)", "Tax-deductible (2025)")}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("3.600 € για δήλωση", "€3,600 to declare")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="group-pension" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="group-pension" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Δείτε τι χτίζει το ομαδικό σας πρόγραμμα.", "See what your group plan is building.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το ομαδικό συνταξιοδοτικό", "Upload your group pension plan")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
