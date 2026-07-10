"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Users, Zap, Crown, Building2, ChevronLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { upgradeSubscription } from "../../account/actions"

const AGENT_PLANS = [
    {
        id: "agent-free",
        tier: "agent_free",
        icon: Users,
        priceEur: 0,
        features: {
            en: [
                "10 customers",
                "5 AI analyses/month",
                "Basic CRM",
                "Manual opportunity tracking",
                "Collaboration threads",
            ],
            el: [
                "10 πελάτες",
                "5 AI αναλύσεις/μήνα",
                "Βασικό CRM",
                "Χειροκίνητη διαχείριση ευκαιριών",
                "Νήματα συνεργασίας",
            ],
        },
    },
    {
        id: "agent-starter",
        tier: "agent_starter",
        icon: Zap,
        priceEur: 19.99,
        popular: true,
        features: {
            en: [
                "100 customers",
                "50 AI analyses/month",
                "Revenue pipeline with values",
                "Renewal alerts",
                "5 questionnaire templates",
                "Branded emails",
                "Bulk import (100 rows)",
                "Portfolio gap view",
            ],
            el: [
                "100 πελάτες",
                "50 AI αναλύσεις/μήνα",
                "Pipeline εσόδων με αξίες",
                "Ειδοποιήσεις ανανέωσης",
                "5 πρότυπα ερωτηματολογίων",
                "Επώνυμα emails",
                "Μαζική εισαγωγή (100 γραμμές)",
                "Ανάλυση χαρτοφυλακίου",
            ],
        },
    },
    {
        id: "agent-pro",
        tier: "agent_pro",
        icon: Crown,
        priceEur: 49.99,
        features: {
            en: [
                "500 customers",
                "200 AI analyses/month",
                "Full pipeline + commission tracking",
                "Renewal automation",
                "Unlimited questionnaires",
                "Branded portal",
                "Team (3 agents)",
                "API access",
                "Cross-sell intelligence",
                "Priority analysis queue",
            ],
            el: [
                "500 πελάτες",
                "200 AI αναλύσεις/μήνα",
                "Πλήρες pipeline + παρακολούθηση προμήθειας",
                "Αυτοματοποίηση ανανεώσεων",
                "Απεριόριστα ερωτηματολόγια",
                "Επώνυμο portal",
                "Ομάδα (3 πράκτορες)",
                "Πρόσβαση API",
                "Cross-sell ευφυΐα",
                "Προτεραιότητα στην ανάλυση",
            ],
        },
    },
    {
        id: "agent-agency",
        tier: "agency",
        icon: Building2,
        priceEur: 99.99,
        features: {
            en: [
                "Unlimited customers & agents",
                "Unlimited AI analyses",
                "White-label branding",
                "Custom integrations",
                "Dedicated support",
                "All Pro features included",
            ],
            el: [
                "Απεριόριστοι πελάτες & πράκτορες",
                "Απεριόριστες AI αναλύσεις",
                "White-label branding",
                "Προσαρμοσμένες ενσωματώσεις",
                "Αποκλειστική υποστήριξη",
                "Όλα τα Pro χαρακτηριστικά",
            ],
        },
    },
]

const copy = {
    en: {
        title: "Agent Plans",
        subtitle: "Choose the plan that fits your brokerage. Upgrade anytime.",
        free: "Free",
        month: "/month",
        currentPlan: "Current Plan",
        upgrade: "Upgrade",
        getStarted: "Get Started",
        contact: "Contact Sales",
        popular: "Most Popular",
        backToDashboard: "Back to Dashboard",
        vatNote: "Prices exclude 24% Greek VAT",
    },
    el: {
        title: "Πλάνα Πρακτόρων",
        subtitle: "Επιλέξτε το πλάνο που ταιριάζει στο πρακτορείο σας. Αναβαθμίστε ανά πάσα στιγμή.",
        free: "Δωρεάν",
        month: "/μήνα",
        currentPlan: "Τρέχον πλάνο",
        upgrade: "Αναβάθμιση",
        getStarted: "Ξεκινήστε",
        contact: "Επικοινωνία",
        popular: "Δημοφιλέστερο",
        backToDashboard: "Πίσω στο Dashboard",
        vatNote: "Οι τιμές δεν περιλαμβάνουν 24% ΦΠΑ",
    },
}

export default function AgentPricingPage() {
    const router = useRouter()
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

    const handleUpgrade = async (planId: string) => {
        setLoadingPlanId(planId)
        try {
            const result = await upgradeSubscription(planId)
            if (result.error) {
                toast.error(result.error)
                return
            }
            if (result.url) {
                toast.success(language === "el" ? "Μεταφορά στο Stripe..." : "Redirecting to Stripe...")
                setTimeout(() => { window.location.href = result.url! }, 800)
            } else if (result.success) {
                toast.success(language === "el" ? "Το πλάνο ενημερώθηκε!" : "Plan updated!")
                router.refresh()
            }
        } catch {
            toast.error(language === "el" ? "Κάτι πήγε στραβά." : "Something went wrong.")
        } finally {
            setLoadingPlanId(null)
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-stone-950 pb-20">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <button
                    onClick={() => router.push("/dashboard/agent")}
                    className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t.backToDashboard}
                </button>

                <div className="text-center mb-12">
                    <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                        {t.title}
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 mt-2 max-w-lg mx-auto">
                        {t.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {AGENT_PLANS.map((plan) => {
                        const Icon = plan.icon
                        const features = plan.features[language === "el" ? "el" : "en"]

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl border p-6 flex flex-col ${
                                    plan.popular
                                        ? "border-primary bg-primary-tint dark:bg-primary/15 ring-2 ring-primary/20"
                                        : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                                }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white dark:text-[#1A2420] text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                                        {t.popular}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        plan.popular
                                            ? "bg-primary text-white dark:text-[#1A2420]"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                                        {plan.tier === "agent_free" && (language === "el" ? "Δωρεάν" : "Free")}
                                        {plan.tier === "agent_starter" && "Starter"}
                                        {plan.tier === "agent_pro" && "Pro"}
                                        {plan.tier === "agency" && (language === "el" ? "Πρακτορείο" : "Agency")}
                                    </h3>
                                </div>

                                <div className="mb-6">
                                    <span className="text-3xl font-black text-stone-900 dark:text-white">
                                        {plan.priceEur === 0 ? t.free : `€${plan.priceEur}`}
                                    </span>
                                    {plan.priceEur > 0 && (
                                        <span className="text-stone-500 dark:text-stone-400 text-sm">{t.month}</span>
                                    )}
                                </div>

                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                                            <Check className="w-4 h-4 text-primary dark:text-mint mt-0.5 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={loadingPlanId !== null}
                                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                        plan.popular
                                            ? "bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover shadow-lg shadow-primary/20"
                                            : plan.priceEur === 0
                                                ? "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                                                : "bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100"
                                    } disabled:opacity-50`}
                                >
                                    {loadingPlanId === plan.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    ) : plan.priceEur === 0 ? (
                                        t.getStarted
                                    ) : plan.tier === "agency" ? (
                                        t.contact
                                    ) : (
                                        t.upgrade
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-8">
                    {t.vatNote}
                </p>
            </div>
        </div>
    )
}
