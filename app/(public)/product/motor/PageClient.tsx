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
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Οχήματα", "Vehicles")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Αυτοκίνητο, μηχανή, οδική βοήθεια: μία καθαρή εικόνα.", "Car, motorbike, roadside assistance: one clear picture.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε τι θα πλήρωνε το συμβόλαιο, τι περιλαμβάνει η οδική βοήθεια και πότε λήγει.", "See what the policy would pay, what your roadside assistance includes, and when it runs out.")}
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
                            {t("Η κάλυψη ακολουθεί ακόμη την αξία του οχήματός σας;", "Does your cover still match your vehicle's value?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Το συμβόλαιο το διαβάζουμε εμείς και σας δείχνουμε τι θα πλήρωνε. Αν φτάνει για το αυτοκίνητό σας σήμερα, το βλέπετε με μια ματιά.", "We read the policy and show you what it would pay. You can see at a glance whether that is enough for your car today.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Αποζημίωση και αξία", "Payout vs value")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Σας δείχνουμε την αποζημίωση που προβλέπει το συμβόλαιο — συγκρίνετέ τη με το τι αξίζει σήμερα το αυτοκίνητό σας.", "We show you the payout the policy provides — compare it with what your car is worth today.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Κενά οδικής βοήθειας", "Roadside assistance gaps")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Στο πλάνο Family, βρίσκουμε παροχές που λείπουν ή πληρώνονται δύο φορές — πριν μείνετε στον δρόμο.", "On the Family plan, we find benefits that are missing or paid for twice — before you are left stranded.")}</p>
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
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium">{t("Πλήρης κάλυψη", "Fully covered")}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {/* Facts a policy document actually states — a
                                "value match %" would imply market-price data
                                the product does not have. */}
                            <div className="flex justify-between text-sm">
                                <span className="text-[#475569] dark:text-slate-300">{t("Απαλλαγή", "Deductible")}</span>
                                <span className="font-medium">{t("500 €", "€500")}</span>
                            </div>
                            <div className="mt-6 flex items-center justify-between bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-[#A7F3D0] p-4 rounded-lg border border-[#29685B]/20">
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
                            {t("Δεν οδηγείτε μόνο αυτοκίνητο; Η ίδια ανάλυση διαβάζει και τα υπόλοιπα συμβόλαια των οχημάτων σας.", "More than just a car? The same analysis reads the rest of your vehicle policies too.")}
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <Bike className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Μοτοσικλέτα", "Motorbike")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Το συμβόλαιο της μοτοσικλέτας αναλύεται όπως και του αυτοκινήτου: αστική ευθύνη, ίδιες ζημιές, εξαιρέσεις — και κοινές ημερομηνίες ανανέωσης σε ένα ημερολόγιο.", "Your motorbike policy is analyzed just like your car's: liability, own damage, exclusions — with all renewal dates in one calendar.")}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                <Wrench className="h-5 w-5 text-[#0F172A] dark:text-white" />
                            </div>
                            <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t("Οδική βοήθεια", "Roadside assistance")}</h3>
                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">
                                {t("Αυτόνομο συμβόλαιο ή παροχή μέσα στο ασφαλιστήριο; Με το Family, δείτε αν πληρώνετε δύο φορές για επιτόπου επισκευή και μεταφορά σε συνεργείο — ή αν δεν την έχετε καθόλου.", "Standalone contract or a benefit inside your motor policy? With Family, see if you're paying twice for on-the-spot repair and towing — or don't have it at all.")}
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
                    {t("Δείτε αν η κάλυψη φτάνει για το όχημά σας σήμερα.", "See whether your cover is still enough for your vehicle today.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο του οχήματος", "Upload your motor policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
