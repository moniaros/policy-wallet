import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Gem, BellRing, ShieldCheck, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"

/**
 * Fine art & valuables — the one genuinely new consumer line the insurance
 * intelligence expansion introduced.
 *
 * Every capability claim on this page maps to something that ships: the
 * schedule of items and agreed values (acordData.insuredItems), the security
 * conditions read back as conditions of cover (acordData.conditions), and
 * optional covers shown as taken or not taken (coverages[].status). The mock UI
 * numbers are synthetic — the real schedules this line was built from carry
 * real people's collections, and none of that belongs in marketing copy.
 */
export default function FineArtProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Πώς ασφαλίζονται τα έργα τέχνης και τα πολύτιμα αντικείμενά σας;", "What can't be replaced is insured by name and value.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε ποια αντικείμενα αναφέρει το ασφαλιστήριο, με ποια αξία και ποιους όρους φύλαξης. Οι καλύψεις διαφέρουν ανά πρόγραμμα.", "Check which items the policy lists, their values and storage requirements. Cover varies by plan.")}
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
                            {t("Δείτε ποια αντικείμενα περιλαμβάνονται.", "A collection is not one amount — it's a list.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Ένα ασφαλιστήριο μπορεί να έχει λίστα αντικειμένων ή συνολικά όρια. Σας βοηθάμε να βρείτε τι προβλέπει το δικό σας.", "A policy may list individual items or set overall limits. We help you find what yours provides.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-brand-accent" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Λίστα αντικειμένων και αξίες", "Schedule of items & values")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε κάθε ασφαλισμένο έργο με τη συμφωνημένη αξία του και το συνολικό όριο — όπως ακριβώς τα γράφει το ασφαλιστήριο.", "See every insured piece with its agreed value and the overall limit — exactly as the policy states them.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-brand-accent" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Όροι ασφαλείας", "Security conditions")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Συναγερμός συνδεδεμένος με κέντρο σημάτων, προστασία ανοιγμάτων: συχνά είναι προϋποθέσεις κάλυψης, όχι συστάσεις. Τους αναδεικνύουμε ώστε να ξέρετε τι πρέπει να τηρείται.", "An alarm linked to a monitoring centre, protected openings: often conditions of cover, not suggestions. We surface them so you know what has to be kept.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-brand-accent" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Προαιρετικές καλύψεις", "Optional covers")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Η φράση «κατά παντός κινδύνου» δεν σημαίνει ότι καλύπτονται τα πάντα. Ελέγξτε αν περιλαμβάνονται σεισμός και άλλοι κίνδυνοι, μαζί με τις εξαιρέσεις.", "All-risks cover does not mean every event is covered. Check whether earthquake and other risks are included, along with exclusions.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-brand-accent" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Πού ισχύει η κάλυψη", "Where the cover applies")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Η κάλυψη συνήθως δένεται με τον χώρο που δηλώνεται στο ασφαλιστήριο. Δείτε τι αναφέρει το δικό σας πριν ένα έργο ταξιδέψει σε έκθεση ή συντηρητή.", "Cover is usually tied to the premises the policy names. See what yours says before a piece travels to an exhibition or a restorer.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI — synthetic figures, not a real schedule */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Συλλογή 4 έργων", "Collection of 4 works")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Συνολική αξία €28.000 · Σε ισχύ", "Total value €28,000 · In force")}</p>
                            </div>
                            <Gem className="w-6 h-6 text-[#29685B] dark:text-brand-accent" />
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-brand-accent text-sm">{t("Κατά παντός κινδύνου: ενεργή", "All risks: active")}</div>
                                <ShieldCheck className="w-5 h-5 text-[#29685B] dark:text-brand-accent" />
                            </div>
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] dark:text-brand-accent text-body-sm">{t("Συναγερμός με κέντρο σημάτων: όρος κάλυψης", "Alarm with monitoring centre: condition of cover")}</div>
                                <BellRing className="w-5 h-5 text-[#29685B] dark:text-brand-accent" />
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800/40">
                                <p className="font-medium text-rose-900 dark:text-rose-200 text-sm">{t("Δεν έχει επιλεγεί", "Not taken")}</p>
                                <p className="text-xs text-rose-700 dark:text-rose-200 mt-1">{t("- Σεισμός — προαιρετική κάλυψη, δείτε τις Ειδικές Συμφωνίες", "- Earthquake — optional cover, see the Special Agreements")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="fine-art" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="fine-art" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Τα πολύτιμα αντικείμενά σας και οι όροι ασφάλισής τους.", "Your collection, with its conditions in the light.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το ασφαλιστήριο", "Upload your policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
