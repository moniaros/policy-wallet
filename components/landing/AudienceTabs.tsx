"use client"

import { useState } from "react"
import {
    CheckCircle2,
    ArrowRight,
    Car,
    Home,
    Heart,
    AlertTriangle,
    TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { localizeHref } from "@/lib/seo/locale-links"

interface AudienceTabsProps {
    isGreek: boolean
}

export function AudienceTabs({ isGreek }: AudienceTabsProps) {
    const [activeTab, setActiveTab] = useState<"policyholders" | "agents">("policyholders")
    const t = (el: string, en: string) => (isGreek ? el : en)

    const phPanelId = "audience-panel-policyholders"
    const agPanelId = "audience-panel-agents"

    const handleKeyDown = (e: React.KeyboardEvent, current: "policyholders" | "agents") => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault()
            setActiveTab(current === "policyholders" ? "agents" : "policyholders")
        }
    }

    return (
        <div>
            {/* Tab list */}
            <div className="mb-10 flex justify-center">
                <div
                    role="tablist"
                    aria-label={t("Επιλογή κοινού", "Audience selection")}
                    className="flex rounded-full border border-[#E2E8F0] bg-[#F1F5F9] p-1"
                >
                    <button
                        type="button"
                        role="tab"
                        id="audience-tab-policyholders"
                        aria-selected={activeTab === "policyholders" ? "true" : "false"}
                        aria-controls={phPanelId}
                        tabIndex={activeTab === "policyholders" ? 0 : -1}
                        onClick={() => setActiveTab("policyholders")}
                        onKeyDown={(e) => handleKeyDown(e, "policyholders")}
                        className={`rounded-full px-6 py-2 text-[14px] font-semibold transition-all duration-200 ${
                            activeTab === "policyholders"
                                ? "bg-[#29685B] text-white shadow-sm"
                                : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                    >
                        {t("Ιδιώτες", "Individuals")}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="audience-tab-agents"
                        aria-selected={activeTab === "agents" ? "true" : "false"}
                        aria-controls={agPanelId}
                        tabIndex={activeTab === "agents" ? 0 : -1}
                        onClick={() => setActiveTab("agents")}
                        onKeyDown={(e) => handleKeyDown(e, "agents")}
                        className={`rounded-full px-6 py-2 text-[14px] font-semibold transition-all duration-200 ${
                            activeTab === "agents"
                                ? "bg-[#29685B] text-white shadow-sm"
                                : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                    >
                        {t("Ασφαλιστές", "Agents")}
                    </button>
                </div>
            </div>

            {/* Tab panels */}
            <div
                role="tabpanel"
                id={phPanelId}
                aria-labelledby="audience-tab-policyholders"
                hidden={activeTab !== "policyholders"}
            >
                <PolicyholderPanel isGreek={isGreek} />
            </div>
            <div
                role="tabpanel"
                id={agPanelId}
                aria-labelledby="audience-tab-agents"
                hidden={activeTab !== "agents"}
            >
                <AgentPanel isGreek={isGreek} />
            </div>
        </div>
    )
}

/* ─── Policyholder Panel ──────────────────────────────────────── */

function PolicyholderPanel({ isGreek }: { isGreek: boolean }) {
    const t = (el: string, en: string) => (isGreek ? el : en)

    const benefits = [
        {
            el: "Όλα τα συμβόλαια — αυτοκίνητο, σπίτι, υγεία — σε μία οθόνη",
            en: "All your policies — auto, home, health — on one screen",
        },
        {
            el: "Ειδοποίηση 30 μέρες πριν τη λήξη, ώστε να μην μείνετε χωρίς κάλυψη",
            en: "Alert 30 days before expiry so you are never left unprotected",
        },
        {
            el: "Εντοπισμός κενών προστασίας που ίσως δεν εντόπισε ούτε ο σύμβουλός σας",
            en: "Gap detection your advisor may have missed",
        },
    ]

    const miniPolicies = [
        { Icon: Car, name: t("Αυτοκίνητο", "Motor"), score: 92, type: "ok" as const },
        { Icon: Home, name: t("Κατοικία", "Home"), score: 71, type: "warn" as const },
        { Icon: Heart, name: t("Υγεία", "Health"), score: 98, type: "ok" as const },
    ]

    return (
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                    {t("Για Ιδιώτες", "For Individuals")}
                </p>
                <h3 className="mb-4 text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#0F172A] lg:text-[32px]">
                    {t(
                        "Για ανθρώπους που θέλουν ηρεμία, όχι εκπλήξεις.",
                        "For people who want peace of mind, not surprises."
                    )}
                </h3>
                <p className="mb-7 text-[16px] leading-relaxed text-[#475569]">
                    {t(
                        "Δεν χρειάζεται πλέον να ψάχνετε σε συρτάρια. Όλα σε ένα μέρος, πάντα ενημερωμένα.",
                        "No more searching through drawers. Everything in one place, always up to date."
                    )}
                </p>
                <ul className="mb-8 space-y-3.5">
                    {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B]" />
                            <span className="text-[14px] text-[#334155]">{t(b.el, b.en)}</span>
                        </li>
                    ))}
                </ul>
                <Link
                    href="/auth/signup?role=policyholder&source=landing_audience"
                    className="pw-primary-button"
                >
                    {t("Δείτε το χαρτοφυλάκιό σας", "See your portfolio")}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            {/* Mini widget */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                        {t("Τα συμβόλαιά μου", "My Policies")}
                    </p>
                    <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold text-[#B45309]">
                        1 {t("κενό", "gap")}
                    </span>
                </div>
                <div className="space-y-2">
                    {miniPolicies.map((p) => (
                        <div
                            key={p.name}
                            className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5"
                        >
                            <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                                    p.type === "warn" ? "bg-[#FEF3C7]" : "bg-[#F0FDF4]"
                                }`}
                            >
                                <p.Icon
                                    className={`h-4 w-4 ${
                                        p.type === "warn" ? "text-[#D97706]" : "text-[#29685B]"
                                    }`}
                                />
                            </div>
                            <span className="flex-1 text-[13px] font-medium text-[#0F172A]">
                                {p.name}
                            </span>
                            {p.type === "warn" ? (
                                <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
                                    <span className="text-[11px] font-semibold text-[#D97706]">
                                        {t("Κενό", "Gap")}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[11px] font-semibold text-[#29685B]">
                                    {p.score}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#D97706]" />
                    <p className="text-[12px] font-medium text-[#92400E]">
                        {t(
                            "Κατοικία: λείπει κάλυψη πλημμύρας",
                            "Home: missing flood coverage"
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}

/* ─── Agent Panel ─────────────────────────────────────────────── */

function AgentPanel({ isGreek }: { isGreek: boolean }) {
    const t = (el: string, en: string) => (isGreek ? el : en)

    const benefits = [
        {
            el: "Χαρτοφυλάκιο όλων των πελατών σε ένα dashboard — ανανεώσεις, κενά, ευκαιρίες",
            en: "All client portfolios in one dashboard — renewals, gaps, opportunities",
        },
        {
            el: "AI cross-sell προτάσεις βασισμένες στο προφίλ κάλυψης κάθε πελάτη",
            en: "AI cross-sell suggestions based on each client's actual coverage profile",
        },
        {
            el: "Μαζική ανάλυση συμβολαίων — 50 αρχεία σε λίγα λεπτά",
            en: "Bulk policy analysis — 50 files in minutes",
        },
    ]

    const clients = [
        { initials: "ΓΚ", name: t("Γ. Κυριακόπουλος", "G. Kyriakopoulos"), renewal: 7, score: 68, alert: true },
        { initials: "ΜΠ", name: t("Μ. Παπαδοπούλου", "M. Papadopoulou"), renewal: 23, score: 91, alert: false },
        { initials: "ΑΔ", name: t("Α. Δημητρίου", "A. Dimitriou"), renewal: 45, score: 84, alert: false },
        { initials: "ΝΣ", name: t("Ν. Σταυρόπουλος", "N. Stavropoulos"), renewal: 62, score: 55, alert: true },
    ]

    return (
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                    {t("Για Ασφαλιστές", "For Insurance Agents")}
                </p>
                <h3 className="mb-4 text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#0F172A] lg:text-[32px]">
                    {t("Λιγότερο χάος. Περισσότερες πωλήσεις.", "Less chaos. More sales.")}
                </h3>
                <p className="mb-7 text-[16px] leading-relaxed text-[#475569]">
                    {t(
                        "Αναπτύξτε το χαρτοφυλάκιό σας χωρίς να αυξήσετε την ομάδα σας. Η AI κάνει τη δουλειά.",
                        "Scale your portfolio without growing your team. AI does the heavy lifting."
                    )}
                </p>
                <ul className="mb-8 space-y-3.5">
                    {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B]" />
                            <span className="text-[14px] text-[#334155]">{t(b.el, b.en)}</span>
                        </li>
                    ))}
                </ul>
                <Link
                    href={localizeHref("/solutions/agents", isGreek ? "el" : "en")}
                    className="pw-primary-button"
                >
                    {t("Δείτε το agent dashboard", "See agent dashboard")}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            {/* Mini agent widget */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                {/* Stats row */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                    {[
                        { value: "47", label: t("Πελάτες", "Clients"), color: "text-[#0F172A]" },
                        { value: "8", label: t("Ανανεώσεις", "Renewals"), color: "text-[#D97706]" },
                        { value: "12", label: t("Ευκαιρίες", "Opps"), color: "text-[#29685B]" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-center"
                        >
                            <p className={`text-[18px] font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-[10px] text-[#64748B]">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Client list */}
                <div className="space-y-2">
                    {clients.map((c) => (
                        <div
                            key={c.name}
                            className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5"
                        >
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#29685B]/10 text-[10px] font-bold text-[#29685B]">
                                {c.initials}
                            </div>
                            <span className="flex-1 truncate text-[12px] font-medium text-[#0F172A]">
                                {c.name}
                            </span>
                            {c.alert ? (
                                <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {c.renewal}d
                                </span>
                            ) : (
                                <span
                                    className={`text-[11px] font-semibold ${
                                        c.score >= 85 ? "text-[#29685B]" : "text-[#64748B]"
                                    }`}
                                >
                                    {c.score}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* AI suggestion */}
                <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
                    <TrendingUp className="h-4 w-4 flex-shrink-0 text-[#4F46E5]" />
                    <p className="text-[12px] font-medium text-[#312E81]">
                        {t(
                            "AI: Γ. Κυριακόπουλος — προτείνεται κάλυψη ζωής",
                            "AI: G. Kyriakopoulos — life cover recommended"
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}
