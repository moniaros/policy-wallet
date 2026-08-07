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
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"

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
                    className="flex rounded-full border border-[#E2E8F0] dark:border-slate-800 bg-[#F1F5F9] dark:bg-slate-800 p-1"
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
                        className={`inline-flex min-h-11 items-center rounded-full px-6 text-body font-semibold transition-all duration-200 ${
                            activeTab === "policyholders"
                                ? "bg-[#29685B] text-white shadow-sm"
                                : "text-[#5B6A7A] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white"
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
                        className={`inline-flex min-h-11 items-center rounded-full px-6 text-body font-semibold transition-all duration-200 ${
                            activeTab === "agents"
                                ? "bg-[#29685B] text-white shadow-sm"
                                : "text-[#5B6A7A] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white"
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
            el: "Όλες οι ασφάλειές σας — αυτοκίνητο, σπίτι, υγεία — σε μία οθόνη",
            en: "All your insurance — car, home, health — on one screen",
        },
        {
            // Reminders start on the Starter plan (Free shows only the date),
            // so the benefit names the plan instead of promising it to everyone.
            el: "Υπενθύμιση πριν λήξει κάτι, για να μη μείνετε ακάλυπτοι — από το πλάνο Starter",
            en: "A reminder before something runs out, so you are never left uncovered — from the Starter plan",
        },
        {
            // Gap detection is a PolicyWallet Plus feature — the benefit names
            // the plan, same honesty rule as the Starter bullet above.
            el: "Βρίσκουμε κενά που ίσως δεν είδε ούτε ο σύμβουλός σας — με το PolicyWallet Plus",
            en: "We find gaps even your own advisor may have missed — with PolicyWallet Plus",
        },
    ]

    const miniPolicies = [
        // Mock app UI speaks consumer words ("Car"); the product taxonomy
        // (catalog, footer) keeps the branch name "Motor".
        { Icon: Car, name: t("Αυτοκίνητο", "Car"), score: 92, type: "ok" as const },
        { Icon: Home, name: t("Σπίτι", "Home"), score: 71, type: "warn" as const },
        { Icon: Heart, name: t("Υγεία", "Health"), score: 98, type: "ok" as const },
    ]

    return (
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
                <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                    {t("Για ιδιώτες", "For individuals")}
                </p>
                <h3 className="mb-4 text-h3 font-semibold leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h2">
                    {t(
                        "Για ανθρώπους που θέλουν ηρεμία, όχι εκπλήξεις.",
                        "For people who want peace of mind, not surprises."
                    )}
                </h3>
                <p className="mb-7 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                    {t(
                        "Τέλος το ψάξιμο στα συρτάρια. Όλα σε ένα μέρος, πάντα ενημερωμένα.",
                        "No more digging through drawers. Everything in one place, always up to date."
                    )}
                </p>
                <ul className="mb-8 space-y-3.5">
                    {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span className="text-body text-[#334155] dark:text-slate-300">{t(b.el, b.en)}</span>
                        </li>
                    ))}
                </ul>
                {/* Reads PRIMARY_ACTION rather than its own wording. This
                    button sits on the SAME page as the hero and the closing
                    CTA, and it used to hard-code the label those two have since
                    moved off — so the homepage showed two different primary
                    promises, the older of which claimed a PolicyWallet Plus
                    outcome on a free signup. */}
                <Link
                    href="/auth/signup?role=policyholder&source=landing_audience"
                    className="pw-primary-button"
                >
                    {pick(PRIMARY_ACTION, isGreek ? "el" : "en")}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
            </div>

            {/* Illustration. One role="img" with a plain-language alternative,
                so assistive tech hears a description instead of reading the
                example data as if it were the visitor's own policies. */}
            <div
                role="img"
                aria-label={t(
                    "Παράδειγμα: τρεις ασφάλειες σε μία οθόνη — αυτοκίνητο και υγεία εντάξει, στην κατοικία λείπει η κάλυψη πλημμύρας.",
                    "Example: three policies on one screen — car and health are fine, the home is missing flood cover."
                )}
                className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-5"
            >
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-body-sm font-semibold text-[#0F172A] dark:text-white">
                        {t("Τα συμβόλαιά μου", "My Policies")}
                    </p>
                    <span className="rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2.5 py-1 text-micro font-semibold text-[#92400E] dark:text-amber-200">
                        1 {t("κενό", "gap")}
                    </span>
                </div>
                <div className="space-y-2">
                    {miniPolicies.map((p) => (
                        <div
                            key={p.name}
                            className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5"
                        >
                            <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                                    p.type === "warn" ? "bg-[#FEF3C7] dark:bg-amber-900/30" : "bg-[#F0FDF4] dark:bg-[#29685B]/15"
                                }`}
                            >
                                <p.Icon
                                    className={`h-4 w-4 ${
                                        p.type === "warn" ? "text-[#92400E] dark:text-amber-200" : "text-[#29685B] dark:text-[#A7F3D0]"
                                    }`}
                                />
                            </div>
                            <span className="flex-1 text-body-sm font-medium text-[#0F172A] dark:text-white">
                                {p.name}
                            </span>
                            {p.type === "warn" ? (
                                <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-[#92400E] dark:text-amber-200" />
                                    <span className="text-micro font-semibold text-[#92400E] dark:text-amber-200">
                                        {t("Κενό", "Gap")}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0]">
                                    {p.score}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#FDE68A] dark:border-amber-500/40 bg-[#FFFBEB] dark:bg-amber-500/10 p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#92400E] dark:text-amber-200" />
                    <p className="text-caption font-medium text-[#92400E] dark:text-amber-200">
                        {t(
                            "Σπίτι: λείπει κάλυψη πλημμύρας",
                            "Home: missing flood cover"
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
            el: "Όλοι οι πελάτες σας σε μία οθόνη — ποιος λήγει, ποιος έχει κενό",
            en: "All your clients on one screen — who is running out, who has a gap",
        },
        {
            el: "Προτάσεις για το τι λείπει σε κάθε πελάτη, βγαλμένες από τα ίδια του τα συμβόλαια",
            en: "Suggestions for what each client is missing, taken from their own policies",
        },
        {
            el: "Στέλνετε 50 αρχεία μαζί και τα διαβάζουμε όλα σε λίγα λεπτά",
            en: "Send 50 files at once and we read every one of them in minutes",
        },
    ]

    const clients = [
        { initials: t("ΓΚ", "GK"), name: t("Γ. Κυριακόπουλος", "G. Kyriakopoulos"), renewal: 7, score: 68, alert: true },
        { initials: t("ΜΠ", "MP"), name: t("Μ. Παπαδοπούλου", "M. Papadopoulou"), renewal: 23, score: 91, alert: false },
        { initials: t("ΑΔ", "AD"), name: t("Α. Δημητρίου", "A. Dimitriou"), renewal: 45, score: 84, alert: false },
        { initials: t("ΝΣ", "NS"), name: t("Ν. Σταυρόπουλος", "N. Stavropoulos"), renewal: 62, score: 55, alert: true },
    ]

    return (
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
                <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                    {t("Για ασφαλιστές", "For insurance agents")}
                </p>
                <h3 className="mb-4 text-h3 font-semibold leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white lg:text-h2">
                    {t("Λιγότερο τρέξιμο. Περισσότεροι πελάτες.", "Less running around. More clients.")}
                </h3>
                <p className="mb-7 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                    {t(
                        "Πάρτε περισσότερους πελάτες χωρίς να πάρετε περισσότερο κόσμο. Κάθε συμβόλαιο διαβάζεται μόνο του μόλις το στείλετε.",
                        "Take on more clients without taking on more staff. Every policy is read on its own the moment you send it."
                    )}
                </p>
                <ul className="mb-8 space-y-3.5">
                    {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span className="text-body text-[#334155] dark:text-slate-300">{t(b.el, b.en)}</span>
                        </li>
                    ))}
                </ul>
                <Link
                    href={localizeHref("/solutions/agents", isGreek ? "el" : "en")}
                    className="pw-primary-button"
                >
                    {t("Δείτε τι παίρνετε", "See what you get")}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
            </div>

            {/* Illustration — described once for assistive tech, so the example
                client names are never read out as real people. */}
            <div
                role="img"
                aria-label={t(
                    "Παράδειγμα: μία οθόνη με 47 πελάτες, 8 ασφάλειες που λήγουν σύντομα και 12 ευκαιρίες, με προτάσεις για το τι λείπει σε κάθε πελάτη.",
                    "Example: one screen showing 47 clients, 8 policies running out soon and 12 opportunities, with suggestions for what each client is missing."
                )}
                className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-5"
            >
                {/* Stats row */}
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                        { value: "47", label: t("Πελάτες", "Clients"), color: "text-[#0F172A] dark:text-white" },
                        { value: "8", label: t("Ανανεώσεις", "Renewals"), color: "text-[#92400E] dark:text-amber-200" },
                        { value: "12", label: t("Ευκαιρίες", "Opportunities"), color: "text-[#29685B] dark:text-[#A7F3D0]" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center"
                        >
                            <p className={`text-lead font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-kicker text-[#5B6A7A] dark:text-slate-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Client list */}
                <div className="space-y-2">
                    {clients.map((c) => (
                        <div
                            key={c.name}
                            className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5"
                        >
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#29685B]/10 text-kicker font-bold text-[#29685B] dark:text-[#A7F3D0]">
                                {c.initials}
                            </div>
                            <span className="flex-1 truncate text-caption font-medium text-[#0F172A] dark:text-white">
                                {c.name}
                            </span>
                            {c.alert ? (
                                <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2 py-0.5 text-kicker font-semibold text-[#92400E] dark:text-amber-200">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {t(`${c.renewal} ημ.`, `${c.renewal}d`)}
                                </span>
                            ) : (
                                <span
                                    className={`text-micro font-semibold ${
                                        c.score >= 85 ? "text-[#29685B]" : "text-[#5B6A7A] dark:text-slate-400"
                                    }`}
                                >
                                    {c.score}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* AI suggestion */}
                {/* Was indigo (#EEF2FF / #4F46E5) — a colour that appears
                    nowhere else on the public site, whose light border had no
                    dark-mode pair. Brand green, both themes. */}
                <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                    <TrendingUp className="h-4 w-4 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                    <p className="text-caption font-medium text-[#166534] dark:text-[#A7F3D0]">
                        {t(
                            "Γ. Κυριακόπουλος — του λείπει ασφάλεια ζωής",
                            "G. Kyriakopoulos — has no life cover"
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}
