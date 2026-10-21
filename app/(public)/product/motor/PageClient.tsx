import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Bike, Car, CheckCircle2, Wrench } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"

export default function MotorProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Αυτοκίνητο, μηχανή, οδική βοήθεια: μία καθαρή εικόνα.", "Car, motorbike, roadside assistance: one clear picture.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε τις καλύψεις, τα όρια, την οδική βοήθεια και την ημερομηνία λήξης που γράφει το ασφαλιστήριο.", "See the cover, limits, roadside assistance and expiry date stated in the policy.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={authHref("/auth/signup", locale)} className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {pick(PRIMARY_ACTION, locale)}
                        </Link>
                    </div>
                    <p className="mt-3 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                        {pick(CTA_REASSURANCE, locale)}
                    </p>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Ποιο ποσό αναφέρει η ασφάλεια του οχήματός σας;", "What amount does your vehicle policy state?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Σας δείχνουμε τα ποσά και τους όρους που αναφέρει το έγγραφο. Δεν υπολογίζουμε την τρέχουσα αξία του οχήματος ούτε την τελική αποζημίωση.", "We show the amounts and terms stated in the document. We do not calculate the vehicle's current value or the final claim payment.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-brand-accent" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Αποζημίωση και αξία", "Payout vs value")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Βρείτε το ποσό ασφάλισης και τον τρόπο υπολογισμού της αποζημίωσης. Επιβεβαιώστε με την εταιρεία τι ισχύει για το δικό σας όχημα.", "Find the insured amount and how compensation is calculated. Confirm with the insurer what applies to your vehicle.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-brand-accent" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κενά οδικής βοήθειας", "Roadside assistance gaps")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Με το Family, δείτε σημεία που χρειάζονται έλεγχο στην οδική βοήθεια. Μια κοινή παροχή σε δύο ασφαλιστήρια δεν σημαίνει από μόνη της περιττό κόστος.", "With Family, see roadside-assistance details that need checking. A shared benefit in two policies does not by itself mean wasted cost.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Tesla Model 3", "Tesla Model 3")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Λήγει σε 14 μέρες", "Runs out in 14 days")}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">{t("35.000 €", "€35,000")}</div>
                                <p className="text-body-sm text-[#166534] dark:text-brand-accent font-medium">{t("Ποσό ασφάλισης", "Insured amount")}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {/* Facts a policy document actually states — a
                                "value match %" would imply market-price data
                                the product does not have. */}
                            <div className="flex justify-between text-sm">
                                <span className="text-[#475569] dark:text-slate-300">{t("Ποσό που πληρώνετε εσείς", "Deductible")}</span>
                                <span className="font-medium">{t("500 €", "€500")}</span>
                            </div>
                            <div className="mt-6 flex items-center justify-between bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-brand-accent p-4 rounded-lg border border-[#29685B]/20">
                                <span className="font-semibold text-sm flex items-center gap-2">
                                    <Car className="w-4 h-4" /> {t("Περιλαμβάνεται οδική βοήθεια", "Roadside assistance included")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MOTORBIKE & ROADSIDE — sub-branches that live under the motor umbrella */}
            <section className="px-6 lg:px-12 py-24">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-12">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Μοτοσικλέτα & οδική βοήθεια", "Motorbike & roadside assistance")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Δεν οδηγείτε μόνο αυτοκίνητο; Η ίδια ανάλυση διαβάζει και τα υπόλοιπα ασφαλιστήρια των οχημάτων σας.", "More than just a car? The same analysis reads the rest of your vehicle policies too.")}
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <Bike className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Μοτοσικλέτα", "Motorbike")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Δείτε τις καλύψεις για ζημιές σε άλλους και στη δική σας μηχανή, τι δεν καλύπτεται και πότε λήγει το ασφαλιστήριο.", "Your motorbike policy is analyzed just like your car's: liability, own damage, exclusions — with all renewal dates in one calendar.")}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <Wrench className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Οδική βοήθεια", "Roadside assistance")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Δείτε αν η οδική βοήθεια είναι ξεχωριστή ή μέρος του ασφαλιστηρίου οχήματος. Ελέγξτε πού ισχύει και αν περιλαμβάνει επισκευή ή μεταφορά σε συνεργείο.", "Check whether roadside assistance is separate or part of the vehicle policy, where it applies and whether it includes repairs or towing.")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="motor" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="motor" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Γνωρίστε τους όρους της ασφάλειας του οχήματός σας.", "Understand the terms of your vehicle insurance.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το ασφαλιστήριο του οχήματος", "Upload your motor policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
