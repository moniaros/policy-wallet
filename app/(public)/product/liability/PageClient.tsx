import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Copy, Dog, Droplets, Bike, ShieldCheck } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"

export default function LiabilityProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const scenarios = [
        {
            icon: Droplets,
            titleEl: "Η μπανιέρα πλημμύρισε τον κάτω όροφο",
            titleEn: "The bathtub flooded the flat below",
            descEl: "Αν προκληθεί ζημιά στον γείτονα, εξετάζεται ποιος ευθύνεται και τι την προκάλεσε. Ελέγξτε αν το ασφαλιστήριο καλύπτει τέτοια ευθύνη.",
            descEn: "If your neighbour's property is damaged, responsibility depends on who caused it and the circumstances. Check whether the policy covers that liability.",
        },
        {
            icon: Dog,
            titleEl: "Ο σκύλος σας δάγκωσε περαστικό",
            titleEn: "Your dog bit a passerby",
            descEl: "Ο κάτοχος ζώου μπορεί να ευθύνεται για ζημιά που προκάλεσε το ζώο. Ελέγξτε αν το ασφαλιστήριο περιλαμβάνει αυτή την ευθύνη και με ποιους όρους.",
            descEn: "An animal's keeper may be liable for damage caused by the animal. Check whether the policy covers that liability and on what terms.",
        },
        {
            icon: Bike,
            titleEl: "Το παιδί έσπασε τζαμαρία με το ποδήλατο",
            titleEn: "Your child broke a glass pane with their bike",
            descEl: "Η ευθύνη για ζημιά που προκάλεσε παιδί εξαρτάται από την ηλικία, την εποπτεία και τα περιστατικά. Η ασφάλιση καλύπτει μόνο όσα προβλέπουν οι όροι της.",
            descEn: "Liability for damage caused by a child depends on age, supervision and the circumstances. Insurance covers only what its terms provide.",
        },
    ]

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Όταν η ζημιά είναι σε ξένη περιουσία, ποιος πληρώνει;", "When the damage is to someone else's property, who pays?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Η αστική ευθύνη αφορά την υποχρέωση να αποζημιώσετε άλλον για ζημιά. Η σχετική ασφάλιση μπορεί να υπάρχει ήδη στο ασφαλιστήριο κατοικίας, με συγκεκριμένα όρια και εξαιρέσεις.", "Civil liability is the obligation to compensate someone else for damage. Cover may already be included in your home policy, subject to limits and exclusions.")}
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

            {/* SCENARIOS */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Τρεις καθημερινές στιγμές που γίνονται λογαριασμός.", "Three everyday moments that turn into a bill.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Παραδείγματα για να ξέρετε τι να αναζητήσετε στους όρους. Δεν αποτελούν απόφαση για το ποιος ευθύνεται ή αν θα πληρωθεί μια ζημιά.", "Examples to help you know what to look for in the terms. They do not determine liability or whether a claim will be paid.")}
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {scenarios.map((scenario) => {
                            const Icon = scenario.icon
                            return (
                                <div key={scenario.titleEn} className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                        <Icon className="h-5 w-5 text-[#0F172A] dark:text-white" />
                                    </div>
                                    <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t(scenario.titleEl, scenario.titleEn)}</h3>
                                    <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">{t(scenario.descEl, scenario.descEn)}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* DUPLICATE-COVERAGE CHECK */}
            <section className="px-6 lg:px-12 py-24">
                <div className="mx-auto max-w-page grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Πριν την αγοράσετε, δείτε αν την έχετε ήδη.", "Before you buy it, see if you already own it.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-6">
                            {t("Ελέγξτε αν το ασφαλιστήριο κατοικίας περιλαμβάνει αστική ευθύνη. Με το Family μπορείτε να δείτε πιθανές κοινές καλύψεις· ο ασφαλιστής σας θα εξηγήσει αν συμπληρώνουν η μία την άλλη.", "Check whether your home policy includes liability cover. Family can show possible overlaps; your adviser can explain whether the policies complement one another.")}
                        </p>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Αν ένας διαθέσιμος έλεγχος εντοπίσει σχετικό σημείο, το εμφανίζουμε για επιβεβαίωση. Αν δεν εμφανιστεί κάτι, δεν σημαίνει ότι η κάλυψη είναι πλήρης.", "If an available check identifies a relevant point, we show it for confirmation. No finding does not mean cover is complete.")}
                        </p>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Έλεγχος αστικής ευθύνης", "Liability check")}</p>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Παράδειγμα ελέγχου", "Example check")}</p>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="p-4 bg-[#F0FDF4] dark:bg-[#29685B]/15 rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div>
                                    <p className="font-medium text-[#166534] dark:text-brand-accent text-sm">{t("Ασφάλεια κατοικίας · Ενότητα Δ", "Home policy · Section D")}</p>
                                    <p className="text-xs text-[#166534] dark:text-brand-accent mt-1">{t("Περιλαμβάνεται ευθύνη οικογένειας", "Family liability included")}</p>
                                </div>
                                <ShieldCheck className="w-5 h-5 text-[#29685B] dark:text-brand-accent" />
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex justify-between border border-amber-100 dark:border-amber-800/40">
                                <div>
                                    <p className="font-medium text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                                        <Copy className="w-4 h-4" /> {t("Πιθανή διπλή κάλυψη", "Possible duplicate cover")}
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">{t("Το ξεχωριστό ασφαλιστήριο ευθύνης επικαλύπτει την Ενότητα Δ", "A separate liability policy overlaps Section D")}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[#475569] dark:text-slate-300">{t("Ζημιές από κατοικίδιο", "Damage caused by a pet")}</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{t("Δεν καλύπτεται", "Not covered")}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full">
                                    <div className="bg-slate-400 w-[0%] h-2 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="liability" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="liability" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Δείτε πού οι καλύψεις σας συμπίπτουν.", "See where your cover overlaps.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ελέγξτε τι έχετε ήδη", "Check what you already have")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
