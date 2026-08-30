import React from "react"
import { authHref } from "@/lib/seo/locale-links"
import Link from "next/link"
import { Activity, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE } from "@/lib/marketing/positioning"
import { MARKET_NUMBERS } from "@/lib/marketing/market-numbers"
import { localizeHref } from "@/lib/seo/locale-links"

export default function HealthProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ζωή & υγεία", "Life & health")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Νοσήλια, δίκτυα, συμμετοχές — σε απλά ελληνικά.", "Hospital cover, networks, out-of-pocket — in plain language.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Δείτε πόσα θα πληρώσετε από την τσέπη σας στη χειρότερη περίπτωση, ποια νοσοκομεία είναι συμβεβλημένα και πού μένετε ακάλυπτοι.", "See how much you would pay yourself in the worst case, which hospitals bill your insurer directly, and where you are left uncovered.")}
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
                            {t("Τι καλύπτει το συμβόλαιο υγείας σας;", "What does your health policy cover?")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed mb-8">
                            {t("Μεταφράζουμε τα ψιλά γράμματα των συμβολαίων υγείας σε καθαρή εικόνα: τι καλύπτεται, μέχρι πού, με πόση δική σας συμμετοχή. Δεν χρειάζεται πια να μαντεύετε τι καλύπτεται.", "We translate the fine print of health policies into a clear picture: what is covered, up to how much, with how much you pay yourself. No more guessing what is covered.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Πληρώνει η ασφαλιστική το νοσοκομείο απευθείας;", "Does the insurer pay the hospital directly?")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Βλέπετε με μια ματιά αν το νοσοκομείο σας χρεώνει απευθείας την ασφαλιστική. Τέλος τα τηλέφωνα την ώρα της ανάγκης.", "See at a glance whether your hospital bills the insurer directly. No more phone calls in the moment of need.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B] dark:text-[#A7F3D0]" /></div>
                                <div>
                                    <h3 className="text-lead font-semibold text-[#0F172A] dark:text-white">{t("Μέγιστο ποσό δικής σας συμμετοχής", "Most you pay yourself")}</h3>
                                    <p className="text-[#475569] dark:text-slate-300">{t("Δείτε καθαρά το ανώτατο ποσό που μπορεί να πληρώσετε μόνοι σας μέσα στη χρονιά, ώστε να ξέρετε τι να υπολογίσετε.", "See clearly the most you could pay yourself in a year, so you know what to plan for.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                            <div>
                                <p className="text-body font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">{t("Πλήρης υγεία", "Full health cover")}</p>
                                <p className="text-body-sm text-[#166534] dark:text-[#A7F3D0] font-medium mt-1">{t("Ενεργό", "Active")}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-title font-medium text-[#0F172A] dark:text-white">{t("1 εκατ. €", "€1M")}</div>
                                <p className="text-body-sm text-gray-500 dark:text-gray-400">{t("Ετήσιο όριο", "Yearly limit")}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center border border-blue-100 dark:border-blue-800/40">
                                <div className="font-medium text-blue-900 dark:text-blue-200 text-sm">{t("Μέγιστη δική σας συμμετοχή: 1.500 €", "Most you pay yourself: €1,500")}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm border border-slate-200 dark:border-white/10">
                                <p className="font-bold flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> {t("Συμβεβλημένα δίκτυα", "Partner hospital networks")}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("Απευθείας χρέωση: ενεργή", "Direct billing: on")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* THE INCREASE LETTER (§6) — the reason this page is the wedge.
                The ΕΔΑ paragraph reads the SAME sourced entry the homepage
                market numbers render, so the two surfaces cannot quote
                different figures. No renewal advice anywhere: the output is
                the questions to ask, never a verdict on the increase. */}
            <section className="px-6 lg:px-12 py-24">
                <div className="mx-auto max-w-reading">
                    <h2 className="text-h2 font-semibold tracking-[-0.03em] leading-[1.1] text-[#0F172A] dark:text-white text-balance mb-6">
                        {t("Ήρθε το γράμμα της αύξησης;", "Did the increase letter arrive?")}
                    </h2>
                    {(() => {
                        const eda = MARKET_NUMBERS.find((n) => n.id === "eda-2024")
                        if (!eda) return null
                        return (
                            <>
                                <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300 mb-6">
                                    {t(
                                        `Το 2024 τα ασφάλιστρα υγείας αυξήθηκαν κατά μέσο όρο ${eda.value} με την ηλικιακή επίδραση — και κατά +1,25% χωρίς αυτήν. Είναι ο επίσημος Ετήσιος Δείκτης Ασφαλίστρων της ΕΛΣΤΑΤ, όχι εκτίμηση.`,
                                        `In 2024 health premiums rose by ${eda.value} on average including the age effect — and by +1.25% without it. That is ELSTAT's official Annual Premium Index, not an estimate.`,
                                    )}
                                </p>
                                <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300 mb-4">
                                    {t(
                                        "Το γράμμα της αύξησης όμως δεν εξηγεί τι παίρνετε για το νέο ασφάλιστρο. Το PolicyWallet διαβάζει το συμβόλαιό σας και σας δείχνει τα όρια, τις εξαιρέσεις και τις περιόδους αναμονής που ήδη έχετε — ώστε το τηλεφώνημα στον ασφαλιστή σας να γίνει με τα δεδομένα μπροστά σας.",
                                        "The increase letter, though, does not explain what you get for the new premium. PolicyWallet reads your policy and shows you the limits, exclusions and waiting periods you already hold — so the call to your insurer happens with the facts in front of you.",
                                    )}
                                </p>
                                <p className="text-body-sm text-[#5B6A7A] dark:text-slate-400">
                                    {t("Πηγή: ", "Source: ")}
                                    <a href={eda.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                                        {pick(eda.source.name, locale)}
                                    </a>
                                    {" · "}{eda.source.dated}
                                </p>
                            </>
                        )
                    })()}
                </div>
            </section>

            {/* QUESTIONS BEFORE RENEWAL (§6) — the product's honest output
                shape: facts from the document, then questions for the
                professional. Understanding, never regulated advice. */}
            <section className="px-6 lg:px-12 py-24 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-reading">
                    <h2 className="text-h2 font-semibold tracking-[-0.03em] leading-[1.1] text-[#0F172A] dark:text-white text-balance mb-6">
                        {t("Πέντε ερωτήσεις πριν ανανεώσετε", "Five questions before you renew")}
                    </h2>
                    <ol className="list-decimal space-y-4 pl-6 text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        <li>{t("Τι ακριβώς άλλαξε σε σχέση με το περσινό συμβόλαιο — στις καλύψεις, όχι μόνο στο ασφάλιστρο;", "What exactly changed from last year's policy — in the covers, not just the premium?")}</li>
                        <li>{t("Άλλαξαν τα όρια κάλυψης ή η απαλλαγή μου;", "Did my limits or my deductible change?")}</li>
                        <li>{t("Προστέθηκαν ή αφαιρέθηκαν εξαιρέσεις;", "Were any exclusions added or removed?")}</li>
                        <li>{t("Ισχύουν ακόμη περίοδοι αναμονής για κάποια κάλυψη;", "Do waiting periods still apply to any cover?")}</li>
                        <li>{t("Το νοσοκομείο που με ενδιαφέρει παραμένει συμβεβλημένο με απευθείας χρέωση;", "Is the hospital I care about still in-network with direct billing?")}</li>
                    </ol>
                    <p className="mt-6 text-body text-[#5B6A7A] dark:text-slate-400">
                        {t("Κάποιος όρος σας μπερδεύει; ", "Unsure about a term? ")}
                        <Link href={localizeHref("/lexiko", locale)} className="font-semibold text-[#29685B] dark:text-[#A7F3D0] underline underline-offset-4">
                            {t("Δείτε το λεξικό ασφαλιστικών όρων.", "See the insurance glossary.")}
                        </Link>
                    </p>
                </div>
            </section>

            <LobFaq categoryId="health" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="health" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Μάθετε τι πληρώνει το συμβόλαιο υγείας σας.", "Know what your health policy pays.")}
                </h2>
                <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο υγείας", "Upload your health policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
