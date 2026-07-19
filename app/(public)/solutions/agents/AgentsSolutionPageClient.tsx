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
        <LoBPageShell activeNav="none">
            <section className="px-6 pb-20 lg:px-12">
                <div className="mx-auto max-w-[1240px]">
                    <div className="mb-14 text-center">
                        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#29685B]">
                            {t("Λύσεις για Ασφαλιστές", "Solutions for Insurance Agents")}
                        </p>
                        <h1 className="mx-auto mb-6 max-w-[920px] text-[40px] font-medium leading-[1.05] tracking-[-0.035em] text-[#0F172A] lg:text-[56px]">
                            {t("Διαχειρίσου 10x περισσότερους πελάτες με το ίδιο χρόνο.", "Manage 10x more clients in the same time.")}
                        </h1>
                        <p className="mx-auto max-w-[760px] text-[18px] leading-relaxed text-[#475569]">
                            {t(
                                "AI-powered client portfolio management για ασφαλιστικούς συμβούλους που θέλουν ταχύτητα, ακρίβεια και επαγγελματική εμπειρία πελάτη.",
                                "AI-powered client portfolio management for advisors who want speed, accuracy, and a premium client experience."
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
                                <h3 className="mb-2 text-[24px] font-medium leading-tight text-[#0F172A]">
                                    {t("Client Portfolio Dashboard", "Client Portfolio Dashboard")}
                                </h3>
                                <p className="text-[16px] leading-relaxed text-[#475569]">
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
                                <h3 className="mb-2 text-[24px] font-medium leading-tight text-[#0F172A]">
                                    {t("Automated Gap Analysis ανά πελάτη", "Automated Gap Analysis per client")}
                                </h3>
                                <p className="text-[16px] leading-relaxed text-[#475569]">
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
                                <h3 className="mb-2 text-[24px] font-medium leading-tight text-[#0F172A]">
                                    {t("One-click renewal reminders", "One-click renewal reminders")}
                                </h3>
                                <p className="text-[16px] leading-relaxed text-[#475569]">
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
                                <h3 className="mb-2 text-[24px] font-medium leading-tight text-[#0F172A]">
                                    {t("Shareable branded policy reports", "Shareable branded policy reports")}
                                </h3>
                                <p className="text-[16px] leading-relaxed text-[#475569]">
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
                    <h2 className="mb-10 text-center text-[32px] font-medium tracking-[-0.03em] text-[#0F172A] lg:text-[44px]">
                        {t("Πώς λειτουργεί", "How it works")}
                    </h2>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">01</p>
                            <h3 className="mb-2 text-[20px] font-medium text-[#0F172A]">
                                {t("Upload client policy", "Upload client policy")}
                            </h3>
                            <p className="text-[14px] text-[#475569]">
                                {t("Ανεβάζετε συμβόλαιο και δεδομένα χαρτοφυλακίου σε λίγα δευτερόλεπτα.", "Upload policy and portfolio data in seconds.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">02</p>
                            <h3 className="mb-2 text-[20px] font-medium text-[#0F172A]">
                                {t("AI analyzes", "AI analyzes")}
                            </h3>
                            <p className="text-[14px] text-[#475569]">
                                {t("Η AI εντοπίζει κενά, ρίσκα και renewal priorities ανά πελάτη.", "AI detects gaps, risks, and renewal priorities per client.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">03</p>
                            <h3 className="mb-2 text-[20px] font-medium text-[#0F172A]">
                                {t("Δημιουργία branded αναφοράς", "Generate branded report")}
                            </h3>
                            <p className="text-[14px] text-[#475569]">
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
                        <h3 className="mb-3 text-[32px] font-medium leading-tight text-[#0F172A]">
                            {t("PolicyWallet Agency για ασφαλιστικά γραφεία", "PolicyWallet Agency for advisor teams")}
                        </h3>
                        <p className="mb-6 text-[16px] leading-relaxed text-[#475569]">
                            {t(
                                "Απεριόριστοι πελάτες, role-based πρόσβαση, pipeline ανανεώσεων και branded reports.",
                                "Unlimited clients, role-based access, renewal pipeline, and branded reports."
                            )}
                        </p>
                        <Link href={localizeHref("/pricing?audience=agent", language)} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0F172A] hover:underline">
                            {t("Μετάβαση στα πλάνα ασφαλιστών", "Go to agent plans")} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
                        <div className="mb-4 flex items-center gap-1 text-[#29685B]">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <span key={index}>★</span>
                            ))}
                        </div>
                        <p className="mb-4 text-[18px] leading-relaxed text-[#0F172A]">
                            {t(
                                "“Με το PolicyWallet έκλεισα renewals 3x πιο γρήγορα και έχω πλέον καθαρή εικόνα για όλο το χαρτοφυλάκιο.”",
                                '"With PolicyWallet, I closed renewals 3x faster and now have full visibility across my portfolio."'
                            )}
                        </p>
                        <p className="text-[14px] font-semibold text-[#475569]">
                            {t("Γιώργος Παπαδόπουλος, Ασφαλιστικός Σύμβουλος", "Giorgos Papadopoulos, Insurance Advisor")}
                        </p>
                    </div>
                </div>

                <div className="mx-auto mt-12 max-w-[1040px] rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#166534]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("Agent Onboarding", "Agent Onboarding")}
                    </div>
                    <h3 className="mb-4 text-[32px] font-medium leading-tight tracking-[-0.03em] text-[#0F172A]">
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
