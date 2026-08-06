import React from "react"
import Link from "next/link"
import { Activity, CheckCircle2, Users } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function GroupHealthProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ομαδική υγεία", "Group health")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Ομαδικό και ατομικό: μία εικόνα, χωρίς διπλοπληρωμές.", "Group and personal cover: one picture, no double-paying.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε τι σας δίνει το ομαδικό της δουλειάς σας, τι προσθέτει το ατομικό σας, και — με το PolicyWallet Plus — τι πληρώνετε δύο φορές χωρίς να το ξέρετε.", "See what your workplace group plan gives you, what your personal policy adds, and — with PolicyWallet Plus — what you are paying for twice without knowing.")}
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
                            {t("Πληρώνετε διπλά για τις ίδιες καλύψεις;", "Are you double-paying for the same coverage?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Μία κάλυψη αρκεί: ό,τι σας παρέχει ήδη η εταιρεία σας δεν χρειάζεται να το ξαναπληρώσετε. Συνδυάστε τις παροχές του ομαδικού με το ατομικό σας συμβόλαιο.", "One cover is enough: what your company already provides, you do not need to pay for again. Combine the benefits of your group plan with your personal policy.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κάλυψη οικογένειας", "Family coverage")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε πού καλύπτονται τα παιδιά και τα μέλη της οικογένειας, με ξεκάθαρα όρια για τον καθένα.", "See where children and family members are covered, with clear limits for each of them.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Συμπληρωματικές παροχές", "Supplementary benefits")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε πότε το ομαδικό πληρώνει τη συμμετοχή που αλλιώς θα βάζατε από την τσέπη σας.", "See when the group plan pays the share you would otherwise pay out of pocket.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Ομαδική υγεία", "Group health")}</p>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">{t("Εταιρεία Παράδειγμα Α.Ε.", "Example Company Ltd")}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">{t("40.000 €", "€40,000")}</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Μέγιστο όριο οικογένειας", "Family maximum")}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">{t("Καλύπτεται και η κόρη σας", "Your daughter is covered too")}</div>
                                <Users className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <p className="font-bold flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> {t("Η δική σας συμμετοχή καλύφθηκε", "Your own share was covered")}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("Το ομαδικό καλύπτει 1.500 € από τα 1.500 € του ατομικού", "The group plan covers €1,500 of the €1,500 you would pay yourself")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="group-health" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="group-health" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Δείτε τι σας καλύπτει ήδη ο εργοδότης σας.", "See what your employer already covers.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το ομαδικό σας", "Upload your group policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
