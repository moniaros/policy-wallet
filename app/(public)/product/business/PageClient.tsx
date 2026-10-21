import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Building2, Wrench, Package, TimerOff, Scale, HardHat } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"

export default function BusinessProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const riskSections = [
        {
            icon: Building2,
            titleEl: "Επαγγελματική Στέγη",
            titleEn: "Business Property",
            descEl: "Κτίριο και βελτιώσεις: πυρκαγιά, σεισμός, φυσικά φαινόμενα. Μέρος ενός προγράμματος που συνδυάζει πολλές καλύψεις.",
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
            descEl: "Δείτε αν προβλέπεται πληρωμή εξόδων ή απώλειας κερδών όταν μια καλυπτόμενη ζημιά διακόψει τη δουλειά.",
            descEn: "Check whether expenses or lost profit are covered when an insured loss interrupts your business.",
        },
        {
            icon: Scale,
            titleEl: "Αστική Ευθύνη",
            titleEn: "Liability",
            descEl: "Ζημιές σε πελάτες και τρίτους μέσα και έξω από τον χώρο σας — γενική και επαγγελματική ευθύνη.",
            descEn: "Damage to customers and third parties inside and outside your premises — general and professional liability.",
        },
        {
            icon: HardHat,
            titleEl: "Ευθύνη Εργοδότη",
            titleEn: "Employer Liability",
            descEl: "Δείτε αν καλύπτεται η ευθύνη του εργοδότη για εργατικό ατύχημα και με ποιες προϋποθέσεις.",
            descEn: "Check whether the employer's liability for a workplace accident is covered and on what terms.",
        },
    ]

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Τι καλύπτει η ασφάλεια της επιχείρησής σας;", "What does your business insurance cover?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Ένα πρόγραμμα για μικρές επιχειρήσεις μπορεί να συνδυάζει πολλές καλύψεις: κτίριο, εξοπλισμό, εμπορεύματα, έξοδα αν σταματήσει η δουλειά και ζημιές σε άλλους. Δείτε ποιες περιλαμβάνει το δικό σας.", "A small business multi-risk policy covers premises, equipment, stock, business interruption and liabilities — but not always all of them together. We show you which sections you bought and which are missing.")}
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

            {/* MULTI-RISK GRID */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Τι να κοιτάξετε στην ασφάλεια της επιχείρησής σας.", "The sections every SME should know.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Ανεβάστε το ασφαλιστήριο της επιχείρησης. Δείτε τι καλύπτει κάθε κατηγορία, μέχρι ποιο ποσό και ποιο μέρος της ζημιάς πληρώνετε εσείς.", "Upload your business policy and see it mapped across these categories — with limits, deductibles and gaps per section.")}
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {riskSections.map((section) => {
                            const Icon = section.icon
                            return (
                                <div key={section.titleEn} className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
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

            <LobFaq categoryId="business" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="business" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Οι καλύψεις της επιχείρησής σας, συγκεντρωμένες.", "Your business has no room for “we're probably covered”.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Δείτε τις καλύψεις σας", "Map your coverage")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
