import React from "react"
import Link from "next/link"
import { Sailboat, Anchor, LifeBuoy, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function BoatProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ασφάλεια Σκάφους", "Boat Insurance")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Πριν λύσετε κάβους, λύστε τα ψιλά γράμματα.", "Before you cast off, untangle the fine print.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Η αστική ευθύνη σκάφους αναψυχής είναι υποχρεωτική στα ελληνικά ύδατα — αλλά το τι καλύπτεται πέρα από αυτήν διαφέρει από συμβόλαιο σε συμβόλαιο. Η AI διαβάζει το δικό σας και σας δείχνει τι ισχύει για σκάφος, μηχανή και τρίτους.", "Third-party liability for leisure boats is mandatory in Greek waters — but what is covered beyond it varies from contract to contract. Our AI reads yours and shows what applies to hull, machinery and third parties.")}
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
                            {t("Ευθύνη, σκάφος, αρωγή: τρία σκέλη, ένα συμβόλαιο.", "Liability, hull, salvage: three sections, one contract.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Το ασφαλιστήριο του σκάφους γράφει με μία ανάσα τι θα πληρωθεί σε πρόσκρουση, βύθιση ή ζημιά σε τρίτο. Εμείς το χωρίζουμε σε καθαρές κάρτες, με τα όρια δίπλα σε κάθε κάλυψη.", "A boat policy states in one breath what gets paid in a collision, sinking or third-party damage. We split it into clean cards, with the limits next to each cover.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Υποχρεωτική Αστική Ευθύνη", "Mandatory Third-Party Liability")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε τα όρια για σωματικές βλάβες και υλικές ζημιές τρίτων και βεβαιωθείτε ότι το συμβόλαιο είναι σε ισχύ πριν βγείτε από το λιμάνι.", "See your limits for third-party bodily injury and property damage, and confirm the policy is in force before you leave port.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Σκάφος & Μηχανή", "Hull & Machinery")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Οι ίδιες ζημιές είναι προαιρετικό σκέλος: αν λείπει, μια πρόσκρουση ή κακοκαιρία μένει εξ ολοκλήρου δικό σας κόστος. Η AI το επισημαίνει αμέσως.", "Own-damage cover is optional: if it's missing, a collision or storm damage remains entirely your cost. The AI flags this instantly.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Επιθαλάσσια Αρωγή & Ανέλκυση", "Salvage & Wreck Removal")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Ρυμούλκηση, αρωγή και ανέλκυση ναυαγίου κοστίζουν ακριβά και δεν περιλαμβάνονται πάντα. Μάθετε αν το δικό σας συμβόλαιο τα καλύπτει.", "Towing, salvage and wreck removal are expensive and not always included. Find out whether your own contract covers them.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Το ασφαλιστήριο πάντα μαζί σας", "Your policy always on board")}</h4>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Σε έλεγχο Λιμενικού ή στη μαρίνα, το έγγραφο είναι στο κινητό σας — όχι σε ένα συρτάρι στη στεριά.", "At a coast guard check or the marina, the document is on your phone — not in a drawer back on land.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[12px] border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Sailing Yacht 9.8m</h3>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">Alimos Marina · In Force</p>
                            </div>
                            <Sailboat className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" />
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">Third-Party Liability Active</div>
                                <LifeBuoy className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-[#A7F3D0] text-sm">Hull & Machinery Included</div>
                                <Anchor className="w-5 h-5 text-[#29685B] dark:text-[#A7F3D0]" />
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800/40">
                                <p className="font-medium text-rose-900 dark:text-rose-200 text-sm">Not Covered</p>
                                <p className="text-xs text-rose-700 dark:text-rose-200 mt-1">- Wreck Removal — check clause 7.2</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="boat" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Στη θάλασσα με σιγουριά, όχι με υποθέσεις.", "At sea with certainty, not assumptions.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο του σκάφους", "Upload your boat policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
