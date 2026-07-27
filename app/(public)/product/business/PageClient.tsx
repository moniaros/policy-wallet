import React from "react"
import Link from "next/link"
import { Building2, Wrench, Package, TimerOff, Scale, HardHat } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function BusinessProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const riskSections = [
        {
            icon: Building2,
            titleEl: "Επαγγελματική Στέγη",
            titleEn: "Business Property",
            descEl: "Κτίριο και βελτιώσεις: πυρκαγιά, σεισμός, φυσικά φαινόμενα. Το θεμέλιο κάθε πολυασφαλιστηρίου.",
            descEn: "Building and improvements: fire, earthquake, natural events. The foundation of every multi-risk policy.",
        },
        {
            icon: Wrench,
            titleEl: "Εξοπλισμός",
            titleEn: "Equipment",
            descEl: "Μηχανήματα, υπολογιστές, επαγγελματικά εργαλεία — ασφαλισμένα σε αξία που πρέπει να μένει ενημερωμένη.",
            descEn: "Machinery, computers, professional tools — insured at values that must be kept up to date.",
        },
        {
            icon: Package,
            titleEl: "Εμπορεύματα",
            titleEn: "Stock",
            descEl: "Το απόθεμα του καταστήματος ή της αποθήκης σας: κλοπή, ζημιά και τα όρια ανά τοποθεσία.",
            descEn: "Your shop or warehouse inventory: theft, damage, and per-location limits.",
        },
        {
            icon: TimerOff,
            titleEl: "Διακοπή Εργασιών",
            titleEn: "Business Interruption",
            descEl: "Αν μια ζημιά κλείσει την επιχείρηση για εβδομάδες, ποιος πληρώνει τα πάγια; Το σκέλος που λείπει συχνότερα.",
            descEn: "If damage shuts you down for weeks, who pays the fixed costs? The section most often missing.",
        },
        {
            icon: Scale,
            titleEl: "Αστική Ευθύνη",
            titleEn: "General Liability",
            descEl: "Ζημιές σε πελάτες και τρίτους μέσα και έξω από τον χώρο σας — γενική και επαγγελματική ευθύνη.",
            descEn: "Injuries or damage to customers and third parties in and around your premises — general and professional liability.",
        },
        {
            icon: HardHat,
            titleEl: "Ευθύνη Εργοδότη",
            titleEn: "Employer Liability",
            descEl: "Η ευθύνη σας απέναντι στο προσωπικό για εργατικό ατύχημα — κρίσιμη για κάθε επιχείρηση με εργαζόμενους.",
            descEn: "Your liability to staff for workplace accidents — critical for any business with employees.",
        },
    ]

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ασφάλεια Επιχείρησης", "Business Insurance")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8">
                        {t("Έξι κίνδυνοι, ένα πολυασφαλιστήριο, μηδέν ασάφεια.", "Six risks, one multi-risk policy, zero ambiguity.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Το πολυασφαλιστήριο μιας μικρής επιχείρησης καλύπτει στέγη, εξοπλισμό, εμπορεύματα, διακοπή εργασιών και ευθύνες — αλλά όχι πάντα όλα μαζί. Η AI δείχνει ποια σκέλη έχετε αγοράσει και ποια λείπουν.", "A small business multi-risk policy covers premises, equipment, stock, interruption and liabilities — but rarely all of them at once. Our AI shows which sections you actually bought and which are missing.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* MULTI-RISK GRID */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white">
                            {t("Τα σκέλη που πρέπει να ξέρει κάθε ΜμΕ.", "The sections every SME should know.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Ανεβάστε το συμβόλαιο της επιχείρησης και δείτε το χαρτογραφημένο σε αυτές τις κατηγορίες — με τα όρια, τις απαλλαγές και τα κενά ανά σκέλος.", "Upload your business policy and see it mapped across these categories — with limits, deductibles and gaps per section.")}
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {riskSections.map((section) => {
                            const Icon = section.icon
                            return (
                                <div key={section.titleEn} className="rounded-[16px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                        <Icon className="h-5 w-5 text-[#0F172A] dark:text-white" />
                                    </div>
                                    <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t(section.titleEl, section.titleEn)}</h3>
                                    <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">{t(section.descEl, section.descEn)}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="business" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Η επιχείρησή σας δεν χωράει «μάλλον καλυπτόμαστε».", "Your business can't run on “we're probably covered”.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Χαρτογραφήστε τις καλύψεις σας", "Map your coverages")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
