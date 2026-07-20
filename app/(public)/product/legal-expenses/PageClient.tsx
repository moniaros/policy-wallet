"use client"

import React from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function LegalExpensesProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const typicallyCovered = [
        {
            titleEl: "Τροχαίες διαφορές",
            titleEn: "Traffic disputes",
            descEl: "Διεκδίκηση αποζημίωσης μετά από ατύχημα, υπεράσπιση σε ποινικές διώξεις από παραβάσεις και προσφυγές κατά προστίμων.",
            descEn: "Claiming compensation after an accident, defence against traffic-related prosecutions and appeals against fines.",
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
            titleEl: "Διαφορές που ξεκίνησαν πριν το συμβόλαιο",
            titleEn: "Disputes that began before the policy",
            descEl: "Η κάλυψη αφορά μελλοντικές διαφορές. Ό,τι είχε ήδη ξεκινήσει πριν την έναρξη —ή μέσα στην περίοδο αναμονής— μένει συνήθως απέξω.",
            descEn: "Cover applies to future disputes. Anything already underway before inception — or during a waiting period — usually stays out.",
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
            descEl: "Πολλά προγράμματα ορίζουν ελάχιστο ύψος διαφοράς και ανώτατο όριο εξόδων ανά υπόθεση. Τα ψιλά γράμματα εδώ κρίνουν τα πάντα.",
            descEn: "Many plans set a minimum dispute value and a per-case cost cap. The fine print here decides everything.",
        },
    ]

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#DCEBDA] text-[#166534] px-3 py-1 rounded-full text-[12px] font-semibold tracking-wider uppercase mb-6">
                        {t("Νομική Προστασία", "Legal Expenses Insurance")}
                    </span>
                    <h1 className="text-[44px] lg:text-[56px] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] mb-8">
                        {t("«Έχω νομική προστασία.» Ξέρετε όμως για τι;", "“I have legal cover.” But do you know for what?")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] leading-[1.5] text-[#475569] mb-10">
                        {t("Η νομική προστασία πληρώνει δικηγόρους, δικαστικά έξοδα και πραγματογνώμονες — αλλά μόνο για τις κατηγορίες διαφορών που γράφει το συμβόλαιο. Δείτε τις δικές σας, όχι τις υποθετικές.", "Legal expenses insurance pays for lawyers, court costs and expert witnesses — but only for the dispute categories written in your policy. See yours, not the hypothetical ones.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* COVERED vs EXCLUDED */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC]">
                <div className="mx-auto max-w-[1240px]">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-[32px] font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A]">
                            {t("Ο πιο παρεξηγημένος κλάδος της ελληνικής αγοράς.", "The most misunderstood line in the Greek market.")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed">
                            {t("Δεν καλύπτει «ό,τι νομικό προκύψει». Κάθε πρόγραμμα ορίζει κατηγορίες διαφορών, περιόδους αναμονής και όρια εξόδων. Έτσι μοιάζει συνήθως η εικόνα:", "It does not cover “whatever legal issue comes up”. Every plan defines dispute categories, waiting periods and cost limits. This is what the picture usually looks like:")}
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-8">
                            <h3 className="text-[14px] font-bold text-[#166534] uppercase tracking-wider mb-6">
                                {t("Συνήθως καλύπτεται", "Typically covered")}
                            </h3>
                            <ul className="space-y-6">
                                {typicallyCovered.map((item) => (
                                    <li key={item.titleEn} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F0FDF4]">
                                            <Check className="w-4 h-4 text-[#29685B]" />
                                        </div>
                                        <div>
                                            <h4 className="text-[18px] font-semibold text-[#0F172A]">{t(item.titleEl, item.titleEn)}</h4>
                                            <p className="text-[14px] leading-relaxed text-[#475569] mt-1">{t(item.descEl, item.descEn)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-8">
                            <h3 className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-6">
                                {t("Συχνές εξαιρέσεις", "Common exclusions")}
                            </h3>
                            <ul className="space-y-6">
                                {typicallyExcluded.map((item) => (
                                    <li key={item.titleEn} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                                            <X className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-[18px] font-semibold text-[#0F172A]">{t(item.titleEl, item.titleEn)}</h4>
                                            <p className="text-[14px] leading-relaxed text-[#475569] mt-1">{t(item.descEl, item.descEn)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <p className="mt-10 max-w-[820px] text-[16px] leading-relaxed text-[#475569]">
                        {t("Ανεβάστε το συμβόλαιό σας και δείτε τη δική σας στήλη «καλύπτεται» και «εξαιρείται» — με τα όρια, τις αναμονές και τα ελάχιστα ποσά όπως ισχύουν για εσάς, σε απλά ελληνικά.", "Upload your policy and see your own “covered” and “excluded” columns — with the limits, waiting periods and thresholds as they apply to you, in plain language.")}
                    </p>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="legal-expenses" />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-[32px] lg:text-[44px] font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Μάθετε τι πληρώνει το συμβόλαιο πριν χρειαστείτε δικηγόρο.", "Learn what your policy pays before you need a lawyer.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-inverse pw-btn-lg">
                    {t("Ανεβάστε τη νομική σας προστασία", "Upload your legal expenses policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
