import React from "react"
import Link from "next/link"
import { PiggyBank, CheckCircle2, AlertTriangle } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function PensionProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Σύνταξη & Αποταμίευση", "Pension & Savings")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Ξέρετε τι υπογράψατε για τη σύνταξή σας;", "Do you know what you signed for your retirement?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Τα αποταμιευτικά και συνταξιοδοτικά προγράμματα είναι δεσμεύσεις δεκαετιών με εισφορές, όρους ωρίμανσης και ρήτρες εξαγοράς. Τα μεταφράζουμε σε καθαρή εικόνα: τι πληρώνετε, τι χτίζετε, τι χάνετε αν σταματήσετε.", "Savings and pension plans are decade-long commitments with contributions, maturity terms and surrender clauses. We turn them into a clear picture: what you pay, what you build, and what you lose if you stop.")}
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
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Πρόγραμμα αποταμίευσης", "Savings plan")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Μηνιαίες εισφορές · Έτος 8 από 25", "Monthly contributions · Year 8 of 25")}</p>
                            </div>
                            <PiggyBank className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" />
                        </div>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569] dark:text-slate-300">{t("Πρόοδος μέχρι τη λήξη", "Progress to the end date")}</span>
                                    <span className="font-medium">32%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full">
                                    <div className="bg-[#29685B] w-[32%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg border border-[#29685B]/20">
                                <p className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">{t("Στη λήξη: εφάπαξ ή σύνταξη", "At the end: lump sum or a pension")}</p>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/40 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-200 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-amber-900 dark:text-amber-200 text-sm">{t("Ποινή πρόωρης εξαγοράς", "Penalty for cashing in early")}</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">{t("Ισχύει πριν το 10ο έτος — δείτε τους όρους", "Applies before year 10 — see the terms")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Η δημόσια σύνταξη είναι το ένα σκέλος. Το δικό σας πρόγραμμα είναι το άλλο.", "The state pension is one leg. Your own plan is the other.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Χτίζετε εισόδημα για τη σύνταξή σας; Τότε πρέπει να ξέρετε ακριβώς πώς δουλεύει το πρόγραμμά σας. Οι όροι που θα κρίνουν το αποτέλεσμα γράφτηκαν τη μέρα που υπογράψατε.", "Building income for your retirement? Then you need to know exactly how your plan works. The terms that decide the outcome were written the day you signed.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Εφάπαξ ή σύνταξη;", "Lump sum or a pension?")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Οι επιλογές ωρίμανσης καθορίζουν αν στη λήξη παίρνετε ένα ποσό ή μηνιαίο εισόδημα. Δείτε τις δικές σας πριν πλησιάσει η ημερομηνία.", "Maturity options decide whether at the end you receive a single amount or a monthly income. See yours before the date approaches.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Όροι εξαγοράς στο φως", "Surrender terms in the open")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Η πρόωρη διακοπή έχει κόστος που ελάχιστοι έχουν διαβάσει. Βρίσκουμε τη ρήτρα εξαγοράς και σας δείχνουμε τι σημαίνει στην πράξη.", "Stopping early has a cost that very few people have read. We find the surrender clause and show you what it means in practice.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Εγγυημένο ή επενδυτικό σκέλος", "Guaranteed or investment part")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Ποιο μέρος της αποταμίευσής σας είναι εγγυημένο και ποιο ακολουθεί την αγορά; Η διάκριση είναι κρίσιμη — και συχνά ασαφής στο συμβόλαιο.", "Which part of your savings is guaranteed and which follows the market? The distinction is critical — and often unclear in the contract.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="pension" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="pension" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Δεκαετίες αποταμίευσης αξίζουν λίγα λεπτά ανάλυσης.", "Decades of saving deserve a few minutes of analysis.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Αναλύστε το πρόγραμμά σας", "Analyze your plan")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
