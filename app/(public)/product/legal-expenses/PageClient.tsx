import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"

export default function LegalExpensesProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const typicallyCovered = [
        {
            titleEl: "Τροχαίες διαφορές",
            titleEn: "Traffic disputes",
            descEl: "Διεκδίκηση αποζημίωσης μετά από ατύχημα, υπεράσπιση σε ποινικές διώξεις από παραβάσεις και προσφυγές κατά προστίμων.",
            descEn: "Claiming compensation after an accident, defense in criminal prosecutions over traffic offenses, and appeals against fines.",
        },
        {
            titleEl: "Εργασιακές διαφορές",
            titleEn: "Employment disputes",
            descEl: "Διαφορές με τον εργοδότη για μισθούς, αποζημίωση απόλυσης ή όρους σύμβασης — για μισθωτούς που καλύπτονται από το πρόγραμμα.",
            descEn: "Disputes with your employer over wages, severance or contract terms — for employees the plan covers.",
        },
        {
            titleEl: "Καταναλωτικές διαφορές",
            titleEn: "Consumer disputes",
            descEl: "Διαφωνίες με προμηθευτές για ελαττωματικά προϊόντα ή υπηρεσίες που δεν παραδόθηκαν όπως συμφωνήθηκε.",
            descEn: "Disagreements with suppliers over defective products or services not delivered as agreed.",
        },
    ]

    const typicallyExcluded = [
        {
            titleEl: "Διαφορές που ξεκίνησαν πριν το ασφαλιστήριο",
            titleEn: "Disputes that began before the policy",
            descEl: "Η κάλυψη αφορά μελλοντικές διαφορές. Ό,τι είχε ήδη ξεκινήσει πριν την έναρξη — ή μέσα στην περίοδο αναμονής — μένει συνήθως απέξω.",
            descEn: "Cover applies to future disputes. Anything already underway before the start date — or during the waiting period — usually stays out.",
        },
        {
            titleEl: "Οικογενειακό και κληρονομικό δίκαιο",
            titleEn: "Family and inheritance law",
            descEl: "Διαζύγια, επιμέλεια και κληρονομικές διαφορές εξαιρούνται συχνά ή καλύπτονται μόνο ως νομική συμβουλή, όχι ως δικαστική εκπροσώπηση.",
            descEn: "Divorce, custody and inheritance disputes are often excluded, or covered only as legal advice rather than court representation.",
        },
        {
            titleEl: "Ποσά κάτω από το ελάχιστο όριο",
            titleEn: "Amounts below the minimum threshold",
            descEl: "Ελέγξτε αν υπάρχει ελάχιστο ποσό διαφοράς και μέχρι πόσα έξοδα καλύπτει το πρόγραμμα για κάθε υπόθεση.",
            descEn: "Many plans set a minimum dispute value and a per-case cost cap. The fine print here decides everything.",
        },
    ]

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("«Έχω νομική προστασία.» Ξέρετε, όμως, για τι;", "“I have legal cover.” But do you know for what?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Η νομική προστασία μπορεί να καλύπτει αμοιβές δικηγόρων και άλλα έξοδα για συγκεκριμένες υποθέσεις. Δείτε ποιες περιλαμβάνει το δικό σας ασφαλιστήριο.", "Legal expenses insurance may cover lawyers' fees and other costs for specified disputes. Check which ones your policy includes.")}
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

            {/* COVERED vs EXCLUDED */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Δεν καλύπτει κάθε νομικό πρόβλημα.", "The most misunderstood line of insurance in the Greek market.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Δεν καλύπτει «ό,τι νομικό προκύψει». Κάθε πρόγραμμα ορίζει κατηγορίες διαφορών, περιόδους αναμονής και όρια εξόδων. Έτσι μοιάζει συνήθως η εικόνα:", "It does not cover “whatever legal issue comes up”. Every plan defines dispute categories, waiting periods and cost limits. This is what the picture usually looks like:")}
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                            <h3 className="text-body font-bold text-[#166534] dark:text-brand-accent uppercase tracking-wider mb-6">
                                {t("Ενδεικτικές καλύψεις", "Examples of cover")}
                            </h3>
                            <ul className="space-y-6">
                                {typicallyCovered.map((item) => (
                                    <li key={item.titleEn} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F0FDF4] dark:bg-[#29685B]/15">
                                            <Check className="w-4 h-4 text-[#29685B] dark:text-brand-accent" />
                                        </div>
                                        <div>
                                            <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t(item.titleEl, item.titleEn)}</h4>
                                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300 mt-1">{t(item.descEl, item.descEn)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                            <h3 className="text-body font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
                                {t("Συχνές εξαιρέσεις", "Common exclusions")}
                            </h3>
                            <ul className="space-y-6">
                                {typicallyExcluded.map((item) => (
                                    <li key={item.titleEn} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                                            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t(item.titleEl, item.titleEn)}</h4>
                                            <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300 mt-1">{t(item.descEl, item.descEn)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <p className="mt-10 max-w-[820px] text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                        {t("Ανεβάστε το ασφαλιστήριο και δείτε τις κατηγορίες υποθέσεων, τα όρια και τις περιόδους αναμονής που αναφέρει.", "Upload the policy to see the types of dispute, limits and waiting periods it describes.")}
                    </p>
                </div>
            </section>

            <LobFaq categoryId="legal-expenses" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="legal-expenses" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Μάθετε τι πληρώνει το ασφαλιστήριο πριν χρειαστείτε δικηγόρο.", "Learn what your policy pays before you need a lawyer.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε τη νομική σας προστασία", "Upload your legal expenses policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
