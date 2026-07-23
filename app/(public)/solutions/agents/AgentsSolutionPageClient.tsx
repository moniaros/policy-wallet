"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { localizeHref } from "@/lib/seo/locale-links"
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
        <LoBPageShell activeNav="none" locale={language}>
            <section className="px-6 pb-20 lg:px-12">
                <div className="mx-auto max-w-page">
                    <div className="mb-14 text-center">
                        <p className="mb-3 text-caption font-semibold uppercase tracking-[0.18em] text-[#29685B]">
                            {t("Λύσεις για Ασφαλιστές", "Solutions for Insurance Agents")}
                        </p>
                        <h1 className="mx-auto mb-6 max-w-[920px] text-h1 font-semibold leading-[1.05] tracking-[-0.035em] text-[#0F172A] lg:text-display">
                            {t("Όλο το χαρτοφυλάκιο πελατών σας, οργανωμένο σε έναν πίνακα.", "Your entire client book, organized in one dashboard.")}
                        </h1>
                        <p className="mx-auto max-w-[760px] text-lead leading-relaxed text-[#475569]">
                            {t(
                                "Ανεβάζετε τα συμβόλαια των πελατών σας· βλέπετε κενά, λήξεις και ευκαιρίες — πριν σας τα ζητήσουν.",
                                "Upload your clients' policies; see gaps, renewals and opportunities — before they ask for them."
                            )}
                        </p>

                        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link href="/auth/signup?role=agent" className="pw-primary-button pw-btn-lg">
                                {t("Ξεκινήστε δωρεάν", "Start free")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={localizeHref("/pricing?audience=agent", language)}
                                className="pw-secondary-button pw-btn-lg"
                            >
                                {t("Δείτε τα πλάνα ασφαλιστών", "View agent plans")}
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-sm">
                            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-4">
                                <ClientPortfolioDashboardWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A]">
                                    {t("Client Portfolio Dashboard", "Client Portfolio Dashboard")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569]">
                                    {t(
                                        "Δείτε όλες τις ανανεώσεις, εκκρεμότητες και ευκαιρίες cross-sell σε ένα πίνακα.",
                                        "View renewals, pending tasks, and cross-sell opportunities in one dashboard."
                                    )}
                                </p>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-sm">
                            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-4">
                                <GapAnalysisWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A]">
                                    {t("Automated Gap Analysis ανά πελάτη", "Automated Gap Analysis per client")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569]">
                                    {t(
                                        "Η AI εντοπίζει κενά κάλυψης ανά συμβόλαιο και προτείνει άμεσα βήματα.",
                                        "AI detects coverage gaps per policy and recommends immediate next actions."
                                    )}
                                </p>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-sm">
                            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-4">
                                <RenewalReminderWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A]">
                                    {t("One-click renewal reminders", "One-click renewal reminders")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569]">
                                    {t(
                                        "Στείλτε προσωποποιημένες υπενθυμίσεις στους πελάτες πριν τη λήξη του συμβολαίου.",
                                        "Send personalized renewal reminders to clients before policy expiration."
                                    )}
                                </p>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-sm">
                            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-4">
                                <BrandedReportWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-h3 font-semibold leading-tight text-[#0F172A]">
                                    {t("Shareable branded policy reports", "Shareable branded policy reports")}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569]">
                                    {t(
                                        "Παραδώστε αναφορές με το brand σας, έτοιμες για εκτύπωση, κοινοποίηση και αρχειοθέτηση.",
                                        "Deliver branded reports ready to print, share, and archive with your own identity."
                                    )}
                                </p>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="bg-[#F8FAFC] px-6 py-20 lg:px-12 lg:py-28">
                <div className="mx-auto max-w-[1040px]">
                    <h2 className="mb-10 text-center text-h2 font-semibold tracking-[-0.03em] text-[#0F172A] lg:text-h1">
                        {t("Από το συμβόλαιο στην αναφορά, σε τρία βήματα.", "From policy to report, in three steps.")}
                    </h2>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">01</p>
                            <h3 className="mb-2 text-title font-semibold text-[#0F172A]">
                                {t("Upload client policy", "Upload client policy")}
                            </h3>
                            <p className="text-body text-[#475569]">
                                {t("Ανεβάζετε συμβόλαιο και δεδομένα χαρτοφυλακίου σε λίγα δευτερόλεπτα.", "Upload policy and portfolio data in seconds.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">02</p>
                            <h3 className="mb-2 text-title font-semibold text-[#0F172A]">
                                {t("AI analyzes", "AI analyzes")}
                            </h3>
                            <p className="text-body text-[#475569]">
                                {t("Η AI εντοπίζει κενά, ρίσκα και renewal priorities ανά πελάτη.", "AI detects gaps, risks, and renewal priorities per client.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">03</p>
                            <h3 className="mb-2 text-title font-semibold text-[#0F172A]">
                                {t("Δημιουργία branded αναφοράς", "Generate branded report")}
                            </h3>
                            <p className="text-body text-[#475569]">
                                {t("Δημιουργείτε επώνυμη αναφορά για τον πελάτη, έτοιμη για εκτύπωση και κοινοποίηση.", "Generate a branded report for your client, ready to print and share.")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-6 py-20 lg:px-12 lg:py-28">
                <div className="mx-auto grid max-w-[1040px] gap-6 lg:grid-cols-[1.35fr_1fr]">
                    <div className="rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] p-8">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#0F172A]">
                            <Sparkles className="h-3.5 w-3.5 text-[#29685B]" />
                            {t("Τιμολόγηση Ασφαλιστών", "Agent Pricing")}
                        </div>
                        <h3 className="mb-3 text-h2 font-semibold leading-tight text-[#0F172A]">
                            {t("PolicyWallet Agency για ασφαλιστικά γραφεία", "PolicyWallet Agency for advisor teams")}
                        </h3>
                        <p className="mb-6 text-body-lg leading-relaxed text-[#475569]">
                            {t(
                                "Απεριόριστοι πελάτες, role-based πρόσβαση, pipeline ανανεώσεων και branded reports.",
                                "Unlimited clients, role-based access, renewal pipeline, and branded reports."
                            )}
                        </p>
                        <Link href={localizeHref("/pricing?audience=agent", language)} className="inline-flex items-center gap-1.5 text-body font-semibold text-[#0F172A] hover:underline">
                            {t("Μετάβαση στα πλάνα ασφαλιστών", "Go to agent plans")} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Verifiable-fact tile — no invented testimonials (EU consumer-law risk). */}
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
                        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">
                            {t("Τι παίρνετε από την πρώτη μέρα", "What you get from day one")}
                        </p>
                        <ul className="space-y-4">
                            {[
                                t("Ανάλυση κάθε συμβολαίου σε λιγότερο από 30 δευτερόλεπτα", "Every policy analyzed in under 30 seconds"),
                                t("20 ασφαλιστικοί κλάδοι, όλες οι ελληνικές ασφαλιστικές", "20 insurance branches, every Greek insurer"),
                                t("Δεδομένα πελατών σε servers ΕΕ, με GDPR & AES-256", "Client data on EU servers, GDPR & AES-256"),
                            ].map((fact) => (
                                <li key={fact} className="flex items-start gap-3 text-body-lg leading-relaxed text-[#0F172A]">
                                    <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-[#29685B]" />
                                    {fact}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mx-auto mt-12 max-w-[1040px] rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#166534]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("Agent Onboarding", "Agent Onboarding")}
                    </div>
                    <h3 className="mb-4 text-h2 font-semibold leading-tight tracking-[-0.03em] text-[#0F172A]">
                        {t("Ξεκινήστε δωρεάν σήμερα", "Start free today")}
                    </h3>
                    <Link href="/auth/signup?role=agent" className="pw-primary-button pw-btn-lg">
                        {t("Δημιουργία Agent Account", "Create Agent Account")}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </LoBPageShell>
    )
}
