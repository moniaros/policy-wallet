import React from "react"
import Link from "next/link"
import { Copy, Dog, Droplets, Bike, ShieldCheck } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function LiabilityProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const scenarios = [
        {
            icon: Droplets,
            titleEl: "Η μπανιέρα πλημμύρισε τον κάτω όροφο",
            titleEn: "The bathtub flooded the flat below",
            descEl: "Ως ένοικος ή ιδιοκτήτης, η ζημιά στο διαμέρισμα του γείτονα είναι δική σας υποχρέωση. Η οικογενειακή αστική ευθύνη την αναλαμβάνει.",
            descEn: "As a tenant or owner, the damage to your neighbour's flat is your obligation. Family liability cover takes it on.",
        },
        {
            icon: Dog,
            titleEl: "Ο σκύλος σας δάγκωσε περαστικό",
            titleEn: "Your dog bit a passer-by",
            descEl: "Ιατρικά έξοδα και αξίωση αποζημίωσης βαραίνουν τον ιδιοκτήτη του ζώου. Ελέγξτε αν το συμβόλαιό σας καλύπτει κατοικίδια — δεν το κάνουν όλα.",
            descEn: "Medical costs and a compensation claim land on the animal's owner. Check whether your policy covers pets — not all of them do.",
        },
        {
            icon: Bike,
            titleEl: "Το παιδί έσπασε τζαμαρία με το ποδήλατο",
            titleEn: "Your child broke a shop window cycling",
            descEl: "Για πράξεις ανήλικων παιδιών ευθύνονται οι γονείς. Η κάλυψη αστικής ευθύνης οικογένειας απαντά σε αυτές ακριβώς τις στιγμές.",
            descEn: "Parents are liable for their minor children's actions. Family liability cover exists for exactly these moments.",
        },
    ]

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] text-[#166534] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Αστική Ευθύνη", "Personal Liability")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] mb-8">
                        {t("Όταν η ζημιά είναι σε ξένη περιουσία, ποιος πληρώνει;", "When the damage is to someone else's property, who pays?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] mb-10">
                        {t("Η αστική ευθύνη καλύπτει ζημιές που προκαλείτε εσείς, το παιδί ή ο σκύλος σας σε τρίτους. Συχνά όμως υπάρχει ήδη μέσα στο συμβόλαιο κατοικίας σας — και την ξαναγοράζετε χωρίς να το ξέρετε.", "Liability cover pays for damage you, your child or your dog cause to others. But it often already sits inside your home policy — and you buy it again without knowing.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* SCENARIOS */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC]">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A]">
                            {t("Τρεις καθημερινές στιγμές που γίνονται λογαριασμός.", "Three everyday moments that turn into a bill.")}
                        </h2>
                        <p className="text-[#475569] text-lead leading-relaxed">
                            {t("Καμία δεν είναι σπάνια και καμία δεν προαναγγέλλεται. Δείτε αν το συμβόλαιό σας απαντά σε καθεμία — με τα όρια και τις εξαιρέσεις της.", "None of them is rare and none announces itself. See whether your policy answers each one — with its limits and exclusions.")}
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {scenarios.map((scenario) => {
                            const Icon = scenario.icon
                            return (
                                <div key={scenario.titleEn} className="rounded-[16px] border border-[#E2E8F0] bg-white p-7">
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#DCEBDA]">
                                        <Icon className="h-5 w-5 text-[#0F172A]" />
                                    </div>
                                    <h3 className="text-title font-semibold text-[#0F172A] mb-3">{t(scenario.titleEl, scenario.titleEn)}</h3>
                                    <p className="text-body leading-relaxed text-[#475569]">{t(scenario.descEl, scenario.descEn)}</p>
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
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A]">
                            {t("Πριν την αγοράσετε, δείτε αν την έχετε ήδη.", "Before you buy it, see if you already own it.")}
                        </h2>
                        <p className="text-[#475569] text-lead leading-relaxed mb-6">
                            {t("Πολλά συμβόλαια κατοικίας περιλαμβάνουν αστική ευθύνη ως ενσωματωμένη κάλυψη — αγορασμένη μαζί με την πυρκαγιά και ξεχασμένη από την πρώτη μέρα. Όταν ανεβάζετε τα συμβόλαιά σας, η ανάλυση διαβάζει κάθε κάλυψη ξεχωριστά και δείχνει πού η ίδια προστασία εμφανίζεται δύο φορές.", "Many home policies include liability as a bundled cover — bought together with the fire section and forgotten since day one. When you upload your policies, the analysis reads every cover separately and shows where the same protection appears twice.")}
                        </p>
                        <p className="text-[#475569] text-lead leading-relaxed">
                            {t("Αν λείπει, το βλέπετε κι αυτό: το κενό εμφανίζεται δίπλα στα υπόλοιπα, με τα όρια που ισχύουν σήμερα.", "And if it's missing, you see that too: the gap appears next to everything else, with the limits that apply today.")}
                        </p>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white p-8 rounded-[12px] border border-[#E2E8F0] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] uppercase tracking-wider">Liability Check</h3>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">2 policies scanned</p>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="p-4 bg-[#F0FDF4] rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div>
                                    <p className="font-medium text-[#166534] text-sm">Home Policy · Section D</p>
                                    <p className="text-xs text-[#166534]/80 mt-1">Family liability included</p>
                                </div>
                                <ShieldCheck className="w-5 h-5 text-[#29685B]" />
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg flex justify-between border border-amber-100">
                                <div>
                                    <p className="font-medium text-amber-900 text-sm flex items-center gap-2">
                                        <Copy className="w-4 h-4" /> Possible duplicate
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">Standalone liability policy overlaps Section D</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg text-sm border border-slate-200">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[#475569]">Pet incidents</span>
                                    <span className="font-medium text-slate-700">Not covered</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full">
                                    <div className="bg-slate-400 w-[0%] h-2 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="liability" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Μία κάλυψη αρκεί. Δύο είναι σπατάλη.", "One cover is enough. Two is a waste.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ελέγξτε τι έχετε ήδη", "Check what you already hold")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
