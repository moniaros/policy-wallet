"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
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
                        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#29685B]">
                            {t("Λύσεις για Ασφαλιστές", "Solutions for Insurance Agents")}
                        </p>
                        <h1 className="mx-auto mb-6 max-w-[920px] text-[42px] font-medium leading-[1.05] tracking-[-0.035em] text-[#0F172A] lg:text-[62px]">
                            {t("Διαχειρίσου 10x περισσότερους πελάτες με το ίδιο χρόνο.", "Manage 10x more clients in the same time.")}
                        </h1>
                        <p className="mx-auto max-w-[760px] text-[19px] leading-relaxed text-[#475569]">
                            {t(
                                "AI-powered client portfolio management για ασφαλιστικούς συμβούλους που θέλουν ταχύτητα, ακρίβεια και επαγγελματική εμπειρία πελάτη.",
                                "AI-powered client portfolio management for advisors who want speed, accuracy, and a premium client experience."
                            )}
                        </p>

                        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link
                                href="/auth/signup?role=agent"
                                className="inline-flex items-center gap-2 rounded-full bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
                            >
                                {t("Ξεκινήστε δωρεάν για 30 μέρες", "Start free for 30 days")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/pricing?audience=agent"
                                className="inline-flex items-center rounded-full border border-[#D0D7DE] bg-white px-8 py-3.5 text-[16px] font-bold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                            >
                                {t("Δείτε Business τιμολόγηση", "View Business pricing")}
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <article className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-sm">
                            <div className="border-b border-[#EDF2F7] bg-[#F8FAFC] p-4">
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
                            <div className="border-b border-[#EDF2F7] bg-[#F8FAFC] p-4">
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
                            <div className="border-b border-[#EDF2F7] bg-[#F8FAFC] p-4">
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
                            <div className="border-b border-[#EDF2F7] bg-[#F8FAFC] p-4">
                                <BrandedReportWidget isGreek={isGreek} />
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-[24px] font-medium leading-tight text-[#0F172A]">
                                    {t("Shareable branded policy reports", "Shareable branded policy reports")}
                                </h3>
                                <p className="text-[16px] leading-relaxed text-[#475569]">
                                    {t(
                                        "Παραδώστε αναφορές με το brand σας, έτοιμες για αποστολή και αρχειοθέτηση.",
                                        "Deliver branded reports ready to send and archive with your own identity."
                                    )}
                                </p>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="bg-[#F8FAFC] px-6 py-20 lg:px-12">
                <div className="mx-auto max-w-[1040px]">
                    <h2 className="mb-10 text-center text-[36px] font-medium tracking-[-0.03em] text-[#0F172A] lg:text-[46px]">
                        {t("Πώς λειτουργεί", "How it works")}
                    </h2>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#DCEBDA] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">01</p>
                            <h3 className="mb-2 text-[22px] font-medium text-[#0F172A]">
                                {t("Upload client policy", "Upload client policy")}
                            </h3>
                            <p className="text-[15px] text-[#475569]">
                                {t("Ανεβάζετε συμβόλαιο και δεδομένα χαρτοφυλακίου σε λίγα δευτερόλεπτα.", "Upload policy and portfolio data in seconds.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#D7E4ED] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">02</p>
                            <h3 className="mb-2 text-[22px] font-medium text-[#0F172A]">
                                {t("AI analyzes", "AI analyzes")}
                            </h3>
                            <p className="text-[15px] text-[#475569]">
                                {t("Η AI εντοπίζει κενά, ρίσκα και renewal priorities ανά πελάτη.", "AI detects gaps, risks, and renewal priorities per client.")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#EBE5D9] bg-white p-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#29685B]">03</p>
                            <h3 className="mb-2 text-[22px] font-medium text-[#0F172A]">
                                {t("Send branded report", "Send branded report")}
                            </h3>
                            <p className="text-[15px] text-[#475569]">
                                {t("Στέλνετε branded αναφορά στον πελάτη με ένα κλικ.", "Send a branded report to the client in one click.")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-6 py-20 lg:px-12">
                <div className="mx-auto grid max-w-[1040px] gap-6 lg:grid-cols-[1.35fr_1fr]">
                    <div className="rounded-2xl border border-[#DCEBDA] bg-[#EAF6F1] p-8">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1E293B]">
                            <Sparkles className="h-3.5 w-3.5 text-[#29685B]" />
                            {t("Business Pricing", "Business Pricing")}
                        </div>
                        <h3 className="mb-3 text-[30px] font-medium leading-tight text-[#0F172A]">
                            {t("PolicyWallet Business για ασφαλιστικά γραφεία", "PolicyWallet Business for advisor teams")}
                        </h3>
                        <p className="mb-6 text-[16px] leading-relaxed text-[#475569]">
                            {t(
                                "Απεριόριστοι πελάτες, role-based πρόσβαση, pipeline ανανεώσεων και branded reports.",
                                "Unlimited clients, role-based access, renewal pipeline, and branded reports."
                            )}
                        </p>
                        <Link href="/pricing?audience=agent" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#0F172A] hover:underline">
                            {t("Μετάβαση στο Business tier", "Go to Business tier")} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
                        <div className="mb-4 flex items-center gap-1 text-[#F59E0B]">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <span key={index}>★</span>
                            ))}
                        </div>
                        <p className="mb-4 text-[17px] leading-relaxed text-[#0F172A]">
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
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#1E3A8A]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("Agent Onboarding", "Agent Onboarding")}
                    </div>
                    <h3 className="mb-4 text-[34px] font-medium leading-tight tracking-[-0.03em] text-[#0F172A]">
                        {t("Ξεκινήστε δωρεάν για 30 μέρες", "Start free for 30 days")}
                    </h3>
                    <Link
                        href="/auth/signup?role=agent"
                        className="inline-flex items-center gap-2 rounded-full bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
                    >
                        {t("Δημιουργία Agent Account", "Create Agent Account")}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </LoBPageShell>
    )
}
