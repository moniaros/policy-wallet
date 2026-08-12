import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Shield, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"

export default function PropertyProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ακίνητα", "Property")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Το σπίτι σας, ασφαλισμένο στη σωστή αξία.", "Your home, insured at the right value.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε τι κεφάλαιο δηλώνει το συμβόλαιό σας, τι καλύπτεται σε σεισμό ή πλημμύρα, και αν έχετε την τριάδα για την έκπτωση ΕΝΦΙΑ.", "See what sum insured your policy states, what is covered in an earthquake or a flood, and whether you hold the trio for the ENFIA discount.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={authHref("/auth/signup", locale)} className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {pick(PRIMARY_ACTION, locale)}
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
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Κύρια κατοικία", "Primary residence")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("120 τ.μ. — Αθήνα", "120 sq.m — Athens")}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569] dark:text-slate-300">{t("Κόστος ανακατασκευής", "Cost to rebuild")}</span>
                                    <span className="font-medium text-amber-700 dark:text-amber-300">{t("Υπασφαλισμένο κατά 15%", "Underinsured by 15%")}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full">
                                    <div className="bg-amber-500 w-[85%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/40 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">{t("Έκπτωση ΕΝΦΙΑ", "ENFIA discount")}</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">{t("Λείπει κάλυψη πλημμύρας", "Flood cover is missing")}</p>
                                </div>
                                <Shield className="w-6 h-6 text-amber-500" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Είναι το σπίτι σας πραγματικά ασφαλισμένο;", "Is your home actually covered?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Διαβάζουμε κάθε κρίσιμο όρο της ασφάλισης κατοικίας και σας λέμε αν το σπίτι σας (και η τσέπη σας) είναι πραγματικά καλυμμένα.", "We read every critical term of your home policy and tell you whether your home (and your wallet) are truly covered.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Έλεγχος κόστους ανακατασκευής", "Rebuild cost check")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Με το PolicyWallet Plus, δείτε αν το ποσό ασφάλισης φτάνει ακόμη για να ξαναχτιστεί το σπίτι σας — πριν πληρώσει λιγότερα η ασφαλιστική.", "With PolicyWallet Plus, see whether the sum insured is still enough to rebuild your home — before the insurer pays out less.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Έκπτωση ΕΝΦΙΑ (Ελλάδα)", "ENFIA tax discount (GR)")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Ελέγχουμε αν έχετε την τριάδα Σεισμού-Πυρκαγιάς-Πλημμύρας που χρειάζεται για την έκπτωση ΕΝΦΙΑ έως 20%.", "We check whether you have the earthquake-fire-flood trio needed for the ENFIA discount of up to 20%.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Μένετε με ενοίκιο;", "Renting your home?")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Η ασφάλεια κατοικίας δεν αφορά μόνο ιδιοκτήτες. Διαβάζουμε με τον ίδιο τρόπο το περιεχόμενο και την ευθύνη του ενοικιαστή. Έτσι ξέρετε τι σας προστατεύει και στο σπίτι που νοικιάζετε.", "Home insurance is not only for owners. We read contents and tenant liability the same way. So you know what protects you in the home you rent, too.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="property" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="property" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Μάθετε αν το σπίτι σας είναι ασφαλισμένο στη σωστή αξία.", "Find out whether your home is insured at the right value.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο κατοικίας", "Upload your home policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
