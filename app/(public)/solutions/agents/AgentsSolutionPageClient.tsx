"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { localizeHref } from "@/lib/seo/locale-links"
import { AGENT_FAQS } from "./faqs"
import { productCategories } from "@/lib/product/catalog"
import { DEFAULT_PLAN_FACTS } from "@/lib/pricing/plan-defaults"
import { formatEur } from "@/lib/pricing/pricing-view-model"

// The solo agent is the majority reader of this page — the pricing section
// must answer "how much for me?" without scrolling to the footer band.
// Name + price derive from the same defaults that seed the live catalog.
const AGENT_STARTER = DEFAULT_PLAN_FACTS.find((p) => p.id === "agent-starter")
import {
    ClientPortfolioDashboardWidget,
    GapAnalysisWidget,
    RenewalReminderWidget,
    BrandedReportWidget,
} from "@/components/landing/AgentWidgets"


export default function AgentSolutionsPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="none" locale={language} audience="agent">
            <section className="px-6 pb-20 lg:px-12">
                <div className="mx-auto max-w-page">
                    <div className="mb-14 text-center">
                        <p className="mb-3 text-caption font-semibold uppercase tracking-[0.18em] text-[#29685B] dark:text-[#A7F3D0]">
                            {t("Για ασφαλιστές", "For insurance agents")}
                        </p>
                        <h1 className="mx-auto mb-6 max-w-[920px] text-h1 font-semibold leading-[1.05] tracking-[-0.035em] text-[#0F172A] dark:text-white lg:text-display text-balance">
                            {t("Όλοι οι πελάτες σας σε μία οθόνη.", "All your clients on one screen.")}
                        </h1>
                        <p className="mx-auto max-w-[760px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                            {t(
                                "Στέλνετε τα συμβόλαια των πελατών σας. Βλέπετε ποιος έχει κενό, ποιος λήγει σύντομα και πού υπάρχει ευκαιρία — πριν σας το ζητήσει κανείς. Είναι η ίδια ανεξάρτητη ανάλυση ρίσκου που εμπιστεύεται ο ασφαλισμένος — σε όλο το χαρτοφυλάκιό σας.",
                                "You send your clients' policies. You see who has a gap, whose cover runs out soon, and where there is an opening — before anyone asks you. It is the same independent risk analysis the policyholder trusts — across your whole book."
                            )}
                        </p>

                        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link href={localizeHref("/auth/signup?role=agent", language)} className="pw-primary-button pw-btn-lg">
                                {t("Ξεκινήστε δωρεάν", "Start free")}
                                <ArrowRight aria-hidden className="h-4 w-4" />
                            </Link>
                            <Link
                                href={localizeHref("/pricing?audience=agent", language)}
                                className="pw-secondary-button pw-btn-lg"
                            >
                                {t("Δείτε τα πλάνα ασφαλιστών", "See agent plans")}
                            </Link>
                        </div>
                    </div>

                    {/* The four cards below are h3s. Without this h2 the page
                        outline jumped h1 → h3, so a screen-reader user
                        navigating by heading could not tell what they belong to. */}
                    <h2 className="mb-8 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-[#0F172A] dark:text-white text-balance">
                        {t("Τι κάνει για εσάς", "What it does for you")}
                    </h2>

                    <div className="grid gap-6 md:grid-cols-2">
                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <div className="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
                                <ClientPortfolioDashboardWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A] dark:text-white">
                                    {t("Όλοι οι πελάτες σε μία οθόνη", "Every client on one screen")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {t(
                                        "Ποιος λήγει, τι εκκρεμεί και πού υπάρχει ευκαιρία — όλα σε ένα σημείο.",
                                        "Who is running out, what is pending, and where there is an opening — all in one place."
                                    )}
                                </p>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <div className="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
                                <GapAnalysisWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A] dark:text-white">
                                    {t("Βρίσκουμε τα κενά κάθε πελάτη", "We find every client\u0027s gaps")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {t(
                                        "Διαβάζουμε κάθε συμβόλαιο, βρίσκουμε τι λείπει και σας λέμε τι να κάνετε μετά.",
                                        "We read every policy, find what is missing, and tell you what to do next."
                                    )}
                                </p>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <div className="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
                                <RenewalReminderWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A] dark:text-white">
                                    {t("Υπενθυμίσεις με ένα κλικ", "Reminders in one click")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {t(
                                        // The expiring-policies list is gated to Agent
                                        // Starter+ in the pricing matrix — the feature
                                        // names the plan, same rule as the consumer side.
                                        "Στείλτε στον πελάτη μια υπενθύμιση με το όνομά του, πριν λήξει το συμβόλαιό του — από το Agent Starter.",
                                        "Send your client a reminder with their name on it, before their policy runs out — from Agent Starter."
                                    )}
                                </p>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <div className="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
                                <BrandedReportWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A] dark:text-white">
                                    {t("Αναφορές με το δικό σας όνομα", "Reports with your own name on them")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {t(
                                        "Δώστε στον πελάτη μια καθαρή αναφορά με τα δικά σας στοιχεία, έτοιμη για εκτύπωση.",
                                        "Hand your client a clear report carrying your own details, ready to print."
                                    )}
                                </p>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="bg-[#F8FAFC] dark:bg-slate-900 px-6 py-20 lg:px-12 lg:py-28">
                <div className="mx-auto max-w-[1040px]">
                    <h2 className="mb-10 text-center text-h2 font-semibold tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h1">
                        {t("Από το συμβόλαιο στην αναφορά, σε τρία βήματα.", "From policy to report, in three steps.")}
                    </h2>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                            <p className="mb-3 text-caption font-semibold uppercase tracking-[0.15em] text-[#29685B] dark:text-[#A7F3D0]">01</p>
                            <h3 className="mb-2 text-title font-semibold text-[#0F172A] dark:text-white">
                                {t("Στέλνετε το συμβόλαιο", "You send the policy")}
                            </h3>
                            <p className="text-body text-[#475569] dark:text-slate-300">
                                {t("Ένα αρχείο με μία κίνηση — ή πενήντα μαζί, με τη μαζική εισαγωγή από το Agent Starter.", "One file in a single step — or fifty at once with bulk import, from Agent Starter.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                            <p className="mb-3 text-caption font-semibold uppercase tracking-[0.15em] text-[#29685B] dark:text-[#A7F3D0]">02</p>
                            <h3 className="mb-2 text-title font-semibold text-[#0F172A] dark:text-white">
                                {t("Το διαβάζουμε", "We read it")}
                            </h3>
                            <p className="text-body text-[#475569] dark:text-slate-300">
                                {t("Βρίσκουμε κενά, κινδύνους και ποιος πελάτης χρειάζεται προσοχή πρώτος.", "We find gaps, risks, and which client needs your attention first.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                            <p className="mb-3 text-caption font-semibold uppercase tracking-[0.15em] text-[#29685B] dark:text-[#A7F3D0]">03</p>
                            <h3 className="mb-2 text-title font-semibold text-[#0F172A] dark:text-white">
                                {t("Δίνετε την αναφορά", "You hand over the report")}
                            </h3>
                            <p className="text-body text-[#475569] dark:text-slate-300">
                                {t("Καθαρή αναφορά με το όνομά σας, έτοιμη να τη δώσετε στον πελάτη.", "A clear report with your name on it, ready to hand to your client.")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-6 py-20 lg:px-12 lg:py-28">
                <div className="mx-auto grid max-w-[1040px] gap-6 lg:grid-cols-[1.35fr_1fr]">
                    <div className="rounded-2xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-8">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-caption font-semibold uppercase tracking-widest text-[#0F172A] dark:text-white">
                            <Sparkles className="h-3.5 w-3.5 text-[#29685B] dark:text-[#A7F3D0]" />
                            {t("Τιμές για ασφαλιστές", "Pricing for agents")}
                        </div>
                        <h3 className="mb-3 text-h2 font-semibold leading-tight text-[#0F172A] dark:text-white">
                            {t("Για ασφαλιστικά γραφεία με ομάδα", "For agencies with a team")}
                        </h3>
                        <p className="mb-3 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                            {t(
                                "Απεριόριστοι πελάτες. Κάθε μέλος της ομάδας βλέπει μόνο ό,τι του αναλογεί. Λίστα λήξεων και αναφορές με το όνομά σας.",
                                "Unlimited clients. Each team member sees only what is theirs. A list of what is running out, and reports with your name on them."
                            )}
                        </p>
                        {AGENT_STARTER ? (
                            <p className="mb-6 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    `Δουλεύετε μόνοι σας; Ξεκινάτε δωρεάν, και το ${AGENT_STARTER.displayName} κοστίζει ${formatEur(AGENT_STARTER.monthlyEur)}/μήνα.`,
                                    `Working on your own? You start free, and ${AGENT_STARTER.displayName} is ${formatEur(AGENT_STARTER.monthlyEur)}/month.`
                                )}
                            </p>
                        ) : null}
                        <Link href={localizeHref("/pricing?audience=agent", language)} className="inline-flex min-h-11 items-center gap-1.5 text-body font-semibold text-[#0F172A] hover:underline dark:text-white">
                            {t("Δείτε τα πλάνα ασφαλιστών", "See agent plans")} <ArrowRight aria-hidden className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Verifiable-fact tile — no invented testimonials (EU consumer-law risk). */}
                    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                        <p className="mb-5 text-caption font-semibold uppercase tracking-[0.15em] text-[#29685B] dark:text-[#A7F3D0]">
                            {t("Τι παίρνετε από την πρώτη μέρα", "What you get from day one")}
                        </p>
                        <ul className="space-y-4">
                            {[
                                t("Κάθε συμβόλαιο διαβασμένο σε λίγα λεπτά", "Every policy read in minutes"),
                                t(
                                    `${productCategories.length} ασφαλιστικοί κλάδοι, κάθε ελληνική ασφαλιστική`,
                                    `${productCategories.length} lines of insurance, every Greek insurer`,
                                ),
                                t("Δεδομένα πελατών σε διακομιστές στην ΕΕ, κρυπτογραφημένα", "Client data on servers in the EU, encrypted"),
                            ].map((fact) => (
                                <li key={fact} className="flex items-start gap-3 text-body-lg leading-relaxed text-[#0F172A] dark:text-white">
                                    <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                                    {fact}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mx-auto mt-12 max-w-[1040px] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] dark:bg-[#29685B]/15 px-3 py-1 text-caption font-semibold uppercase tracking-[0.15em] text-[#166534] dark:text-[#A7F3D0]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("Ξεκινήστε σήμερα", "Start today")}
                    </div>
                    <h3 className="mb-4 text-h2 font-semibold leading-tight tracking-[-0.03em] text-[#0F172A] dark:text-white">
                        {t("Δοκιμάστε το με έναν πελάτη.", "Try it with one client.")}
                    </h3>
                    <Link href={localizeHref("/auth/signup?role=agent", language)} className="pw-primary-button pw-btn-lg">
                        {t("Ανοίξτε δωρεάν λογαριασμό", "Open a free account")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* Answers to the questions an agent (and an answer engine) actually
                asks — including the CRM negative this page most needs. */}
            <section aria-labelledby="agents-faq-heading" className="px-6 pb-24 lg:px-12">
                <div className="mx-auto max-w-[820px]">
                    <h2
                        id="agents-faq-heading"
                        className="mb-8 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] dark:text-white"
                    >
                        {t("Συχνές ερωτήσεις ασφαλιστών", "Common questions from agents")}
                    </h2>
                    <div className="space-y-8">
                        {AGENT_FAQS.map((item) => (
                            <div key={item.q.en}>
                                <h3 className="mb-2 text-title font-semibold text-[#0F172A] dark:text-white">
                                    {t(item.q.el, item.q.en)}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {t(item.a.el, item.a.en)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </LoBPageShell>
    )
}
