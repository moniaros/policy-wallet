import { Metadata } from "next"
import Link from "next/link"
import {
    BarChart3,
    Users,
    Shield,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    Briefcase,
    TrendingUp,
    Clock,
    MessageSquare,
} from "lucide-react"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"

export const metadata: Metadata = buildMarketingMetadata("for-agents")

const FEATURES = [
    {
        icon: BarChart3,
        titleEl: "Dashboard KPIs",
        titleEn: "Dashboard KPIs",
        descEl: "Παρακολουθήστε πελάτες, ανανεώσεις, προμήθειες και ευκαιρίες σε ένα σημείο.",
        descEn: "Track clients, renewals, commissions and opportunities in one place.",
    },
    {
        icon: Sparkles,
        titleEl: "AI Ανάλυση Κάλυψης",
        titleEn: "AI Coverage Analysis",
        descEl: "Η AI αναλύει συμβόλαια πελατών και εντοπίζει κενά κάλυψης αυτόματα.",
        descEn: "AI analyzes client policies and detects coverage gaps automatically.",
    },
    {
        icon: Users,
        titleEl: "Διαχείριση Πελατών 360°",
        titleEn: "360° Client Management",
        descEl: "Πλήρης εικόνα κάθε πελάτη: συμβόλαια, κενά, μηνύματα, προτάσεις.",
        descEn: "Complete view of each client: policies, gaps, messages, proposals.",
    },
    {
        icon: MessageSquare,
        titleEl: "Συνεργασία σε Πραγματικό Χρόνο",
        titleEn: "Real-Time Collaboration",
        descEl: "Μηνύματα, ερωτηματολόγια και αιτήματα εγγράφων μέσα στην πλατφόρμα.",
        descEn: "Messages, questionnaires and document requests within the platform.",
    },
    {
        icon: TrendingUp,
        titleEl: "Ευκαιρίες Cross-Sell",
        titleEn: "Cross-Sell Opportunities",
        descEl: "Εντοπισμός ευκαιριών πώλησης βασισμένων σε κενά κάλυψης πελάτη.",
        descEn: "Identify sales opportunities based on client coverage gaps.",
    },
    {
        icon: Clock,
        titleEl: "Αυτόματες Υπενθυμίσεις",
        titleEn: "Automated Reminders",
        descEl: "Ειδοποιήσεις ανανέωσης, εκκρεμείς ενέργειες και milestones.",
        descEn: "Renewal alerts, pending actions and milestone notifications.",
    },
]

// Kept truthful against AGENT_PRICING + AGENT_ENTITLEMENT_LIMITS in
// lib/subscription-entitlements.ts. The old preview showed stale prices
// (€19/€49), only three tiers, and a false "unlimited" on Pro.
const TIERS = [
    {
        nameEl: "Free", nameEn: "Free",
        priceEl: "€0/μήνα", priceEn: "€0/month",
        descEl: "Έως 10 πελάτες", descEn: "Up to 10 clients",
        features: ["10 clients", "5 AI analyses/mo", "Basic CRM", "Email notifications"],
    },
    {
        nameEl: "Starter", nameEn: "Starter",
        priceEl: "€19,99/μήνα", priceEn: "€19.99/month",
        descEl: "Έως 100 πελάτες", descEn: "Up to 100 clients",
        features: ["100 clients", "50 AI analyses/mo", "Proposals & document requests", "Renewal pipeline"],
        highlighted: true,
    },
    {
        nameEl: "Pro", nameEn: "Pro",
        priceEl: "€49,99/μήνα", priceEn: "€49.99/month",
        descEl: "Έως 500 πελάτες", descEn: "Up to 500 clients",
        features: ["500 clients", "Cross-sell intelligence", "Commission tracking", "Team (3 agents)"],
    },
    {
        nameEl: "Πρακτορείο", nameEn: "Agency",
        priceEl: "€99,99/μήνα", priceEn: "€99.99/month",
        descEl: "Απεριόριστοι πελάτες", descEn: "Unlimited clients",
        features: ["Unlimited clients & agents", "Unlimited AI", "Agency management", "Priority support"],
    },
]

export default function ForAgentsPage() {
    // Server component — defaulting to EN for SEO, client toggles language
    const isGreek = false
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-black">
            {/* Hero Section */}
            <section className="relative overflow-hidden px-4 py-20 sm:py-28">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-black dark:via-black dark:to-indigo-950/20" />
                <div className="relative mx-auto max-w-5xl text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-600 backdrop-blur-sm dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400">
                        <Briefcase className="h-4 w-4" />
                        {t("Για Ασφαλιστικούς Συμβούλους", "For Insurance Agents")}
                    </div>

                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                        {t("Το Πορτοφόλι Πελατών σας.", "Your Client Portfolio.")}
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            {t("Με AI Δυνάμεις.", "AI-Powered.")}
                        </span>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                        {t(
                            "Διαχειριστείτε πελάτες, εντοπίστε ευκαιρίες cross-sell και αυτοματοποιήστε ανανεώσεις — όλα σε μία πλατφόρμα.",
                            "Manage clients, identify cross-sell opportunities and automate renewals — all in one platform."
                        )}
                    </p>

                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/auth/signup?role=agent"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                        >
                            <Shield className="h-5 w-5" />
                            {t("Ξεκινήστε Δωρεάν", "Start Free")}
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                            {t("Δείτε τα Plans", "View Plans")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {t("Εργαλεία για τον σύγχρονο σύμβουλο", "Tools for the modern advisor")}
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
                        {t(
                            "Αποκτήστε πλήρη εικόνα, αυτοματοποιήστε ενέργειες και αυξήστε τις πωλήσεις σας.",
                            "Get full visibility, automate actions and grow your sales."
                        )}
                    </p>
                </div>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => {
                        const Icon = feature.icon
                        return (
                            <div
                                key={feature.titleEn}
                                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
                            >
                                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {isGreek ? feature.titleEl : feature.titleEn}
                                </h3>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    {isGreek ? feature.descEl : feature.descEn}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Pricing Preview */}
            <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {t("Επιλέξτε το σωστό plan", "Choose the right plan")}
                    </h2>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.nameEn}
                            className={`rounded-2xl border p-6 ${
                                tier.highlighted
                                    ? "border-indigo-400 bg-indigo-50 shadow-lg dark:border-indigo-600 dark:bg-indigo-950/20"
                                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                            }`}
                        >
                            {tier.highlighted && (
                                <span className="mb-3 inline-block rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                                    {t("Δημοφιλές", "Popular")}
                                </span>
                            )}
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {isGreek ? tier.nameEl : tier.nameEn}
                            </h3>
                            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                                {isGreek ? tier.priceEl : tier.priceEn}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {isGreek ? tier.descEl : tier.descEn}
                            </p>
                            <ul className="mt-4 space-y-2">
                                {tier.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                        <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/auth/signup?role=agent"
                                className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-bold transition ${
                                    tier.highlighted
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                        : "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                                }`}
                            >
                                {t("Ξεκινήστε", "Get Started")}
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-16 text-center text-white">
                <h2 className="text-3xl font-bold">
                    {t("Ξεκινήστε σήμερα, δωρεάν", "Start today, for free")}
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-indigo-100">
                    {t(
                        "Δημιουργήστε λογαριασμό σε 60 δευτερόλεπτα και αρχίστε να διαχειρίζεστε πελάτες.",
                        "Create an account in 60 seconds and start managing clients."
                    )}
                </p>
                <Link
                    href="/auth/signup?role=agent"
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                    {t("Δημιουργία Λογαριασμού", "Create Account")}
                    <ArrowRight className="h-5 w-5" />
                </Link>
            </section>
        </div>
    )
}
