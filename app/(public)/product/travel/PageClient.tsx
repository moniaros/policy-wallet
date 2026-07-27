import React from "react"
import Link from "next/link"
import { Plane, Stethoscope, CalendarX2, Luggage } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function TravelProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ταξιδιωτική Ασφάλεια", "Travel Insurance")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Διαβάστε το συμβόλαιο πριν το check-in.", "Read the policy before you check in.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Η ταξιδιωτική ασφάλεια αγοράζεται σε δύο κλικ μαζί με το εισιτήριο — και συνήθως κανείς δεν βλέπει τα όρια, τις εξαιρέσεις ή την απαλλαγή. Η AI τα εμφανίζει πριν φύγετε, όχι στο ταμείο ενός νοσοκομείου στο εξωτερικό.", "Travel cover is bought in two clicks with the ticket — and nobody reads the limits, exclusions or excess. Our AI surfaces them before you leave, not at the cashier of a foreign hospital.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* PRE-FLIGHT CHECKLIST — three cards instead of the split layout */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white">
                            {t("Τρία πράγματα που ελέγχουμε πριν πετάξετε.", "Three things we check before you fly.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Ανεβάζετε το PDF της ταξιδιωτικής σας και βλέπετε αμέσως τι ισχύει για ιατρικά έκτακτα, ακύρωση και αποσκευές — σε απλά ελληνικά.", "Upload your travel policy PDF and instantly see what applies to medical emergencies, cancellation and luggage — in plain language.")}
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="rounded-[16px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <Stethoscope className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Ιατρικά έκτακτα & Σένγκεν", "Emergency medical & Schengen")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Πόσο είναι το όριο ιατρικής κάλυψης στο εξωτερικό; Αν φιλοξενείτε ταξιδιώτη που χρειάζεται βίζα Σένγκεν, η αίτηση απαιτεί ταξιδιωτική ιατρική ασφάλιση με ελάχιστη κάλυψη 30.000 €.", "What is your emergency medical limit abroad? If you host a traveler who needs a Schengen visa, the application requires travel medical insurance with at least €30,000 of coverage.")}
                            </p>
                        </div>
                        <div className="rounded-[16px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <CalendarX2 className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Ακύρωση ταξιδιού", "Trip cancellation")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Για ποιους λόγους αποζημιώνεστε αν ακυρώσετε — ασθένεια, ατύχημα, κάτι άλλο; Μέχρι ποιο ποσό και με ποια δικαιολογητικά; Οι όροι διαφέρουν πολύ από πρόγραμμα σε πρόγραμμα.", "Which cancellation reasons are actually reimbursed — illness, accident, anything else? Up to what amount and with what proof? Terms vary widely between plans.")}
                            </p>
                        </div>
                        <div className="rounded-[16px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <Luggage className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Αποσκευές & επαναπατρισμός", "Luggage & repatriation")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Χαμένη βαλίτσα, καθυστερημένη πτήση, ανάγκη επιστροφής στην Ελλάδα: δείτε τι από αυτά περιλαμβάνει το δικό σας πρόγραμμα και πού σταματάει η κάλυψη.", "Lost luggage, a delayed flight, a medical repatriation home: see which of these your plan includes and exactly where the coverage stops.")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="travel" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Ταξιδέψτε ξέροντας τι ισχύει.", "Travel knowing exactly what applies.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    <Plane className="h-5 w-5" />
                    {t("Ανεβάστε την ταξιδιωτική σας", "Upload your travel policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
