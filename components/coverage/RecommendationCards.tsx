"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
    AlertTriangle,
    ArrowRight,
    Car,
    ChevronDown,
    ChevronUp,
    FileSearch,
    Heart,
    Home,
    Lightbulb,
    MessageCircle,
    PawPrint,
    Plane,
    Scale,
    Shield,
    ShieldAlert,
    Umbrella,
} from "lucide-react"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { EmptyState, RecommendationPreviewCard } from "@/components/ui/EmptyState"
import type { SmartCardContent } from "@/lib/services/gap-engine/portfolio-rules"
import { LockedInsightPreview } from "@/components/monetization/LockedInsightPreview"

// ── Types ────────────────────────────────────────────────────────────

interface Recommendation {
    id: string
    lineOfBusiness: string
    ruleId: string | null
    title: { en: string; el: string }
    description: { en: string; el: string }
    urgency: "critical" | "high" | "medium" | "low"
    estimatedCostEur: number | null
    personalReason: { en: string; el: string }
    status: string
    createdAt: string
    matchedProduct?: {
        id: string
        name: { en: string; el: string }
        premiumRangeLow: number | null
        premiumRangeHigh: number | null
        keyBenefits: Array<{ en: string; el: string }> | null
    } | null
}

interface RecommendationCardsProps {
    recommendations: Recommendation[]
    language: "en" | "el"
    /** True when the risk-profile wizard is rendered on the same page. */
    profileIncomplete?: boolean
    /** Evidence / next action / review target per ruleId (from the gap engine). */
    smartContent?: Record<string, SmartCardContent>
    /** When "free", evidence/next-step details render behind a soft paywall. */
    tier?: "free" | "plus" | "pro"
}

// ── LOB icon map ─────────────────────────────────────────────────────

const LOB_ICON: Record<string, typeof Shield> = {
    motor: Car,
    home: Home,
    health: Heart,
    life: Shield,
    travel: Plane,
    pet: PawPrint,
    liability: Scale,
    legal_expenses: Scale,
    income_protection: Umbrella,
    disability: ShieldAlert,
}

// ── Urgency styles ───────────────────────────────────────────────────

const URGENCY_STYLES: Record<
    string,
    { border: string; bg: string; badge: string; badgeBg: string; icon: string }
> = {
    critical: {
        border: "border-red-300 dark:border-red-800",
        bg: "bg-red-50/50 dark:bg-red-950/20",
        badge: "text-red-700 dark:text-red-300",
        badgeBg: "bg-red-100 dark:bg-red-900/30",
        icon: "text-red-500",
    },
    high: {
        border: "border-orange-300 dark:border-orange-800",
        bg: "bg-orange-50/50 dark:bg-orange-950/20",
        badge: "text-orange-700 dark:text-orange-300",
        badgeBg: "bg-orange-100 dark:bg-orange-900/30",
        icon: "text-orange-500",
    },
    medium: {
        border: "border-amber-200 dark:border-amber-800",
        bg: "bg-amber-50/30 dark:bg-amber-950/10",
        badge: "text-amber-700 dark:text-amber-300",
        badgeBg: "bg-amber-100 dark:bg-amber-900/30",
        icon: "text-amber-500",
    },
    low: {
        border: "border-black/10 dark:border-white/10",
        bg: "bg-black/[0.02] dark:bg-white/[0.02]",
        badge: "text-slate-600 dark:text-slate-300",
        badgeBg: "bg-slate-100 dark:bg-slate-800",
        icon: "text-slate-400",
    },
}

const URGENCY_LABELS: Record<string, { en: string; el: string }> = {
    critical: { en: "Critical", el: "Κρίσιμο" },
    high: { en: "High priority", el: "Υψηλή προτεραιότητα" },
    medium: { en: "Recommended", el: "Συνιστάται" },
    low: { en: "Nice to have", el: "Προαιρετικό" },
}

// ── Component ────────────────────────────────────────────────────────

export function RecommendationCards({
    recommendations,
    language,
    profileIncomplete = false,
    smartContent = {},
    tier,
}: RecommendationCardsProps) {
    const evidenceLocked = tier === "free"
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)

    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)

    const visible = recommendations.filter((r) => !dismissedIds.has(r.id))
    const displayed = showAll ? visible : visible.slice(0, 3)

    async function handleDismiss(id: string, reason: string) {
        setDismissedIds((prev) => new Set(prev).add(id))
        try {
            const res = await fetch(`/api/v1/recommendations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "dismiss", reason }),
            })
            if (!res.ok) throw new Error("DISMISS_FAILED")
        } catch {
            toast.error(t("Αποτυχία απόρριψης", "Failed to dismiss"))
            setDismissedIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    if (visible.length === 0) {
        return (
            <EmptyState
                icon={Lightbulb}
                headline={t("Οι προτάσεις σας ετοιμάζονται", "Your recommendations are on the way")}
                description={t(
                    "Όσο πληρέστερο το προφίλ και τα συμβόλαιά σας, τόσο πιο εύστοχες οι προτάσεις της AI.",
                    "The more complete your profile and policies, the sharper the AI's recommendations."
                )}
                cta={
                    profileIncomplete
                        ? {
                              label: t("Συμπλήρωση προφίλ κινδύνου", "Complete your risk profile"),
                              onClick: () =>
                                  document
                                      .getElementById("risk-profile-wizard")
                                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                          }
                        : { label: t("Προσθήκη συμβολαίου", "Add a policy"), href: "/wallet/add" }
                }
                previewLabel={t("Παράδειγμα", "Example")}
                preview={
                    <RecommendationPreviewCard
                        title={t("Αύξηση κάλυψης κατοικίας", "Increase home coverage")}
                        meta={t(
                            "Η κάλυψη περιεχομένου φαίνεται χαμηλή για το προφίλ σας.",
                            "Your contents coverage looks low for your profile."
                        )}
                        urgencyLabel={t("Συνιστάται", "Recommended")}
                    />
                }
                trust={t(
                    "Ενημερωτικές προτάσεις — όχι ασφαλιστική συμβουλή",
                    "Informational suggestions — not insurance advice"
                )}
            />
        )
    }

    return (
        <div className="pw-card p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 dark:bg-amber-900/25">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {t("Προτάσεις Κάλυψης", "Coverage Recommendations")}
                    </h2>
                    <p className="text-xs text-black/55 dark:text-white/60">
                        {t(
                            `${visible.length} προτάσεις βασισμένες στο προφίλ σας`,
                            `${visible.length} recommendation${visible.length !== 1 ? "s" : ""} based on your profile`
                        )}
                    </p>
                </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
                {displayed.map((rec) => {
                    const styles = URGENCY_STYLES[rec.urgency] || URGENCY_STYLES.low
                    const Icon = LOB_ICON[rec.lineOfBusiness.toLowerCase()] || Shield
                    const urgLabel = URGENCY_LABELS[rec.urgency] || URGENCY_LABELS.low
                    const isExpanded = expandedId === rec.id
                    const smart = rec.ruleId ? smartContent[rec.ruleId] : undefined
                    const reviewHref = smart?.reviewHref ?? null
                    const isAgentCard = rec.ruleId === "no_agent_connected"
                    const reviewLabel = t("Έλεγχος", "Review this")
                    const reviewClasses =
                        "inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"

                    return (
                        <div
                            key={rec.id}
                            className={`rounded-2xl border ${styles.border} ${styles.bg} p-4 transition-all`}
                        >
                            <div className="flex items-start gap-3">
                                {/* LOB icon */}
                                <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
                                    <Icon className="h-5 w-5" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Risk detected + severity */}
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="text-sm font-semibold text-black dark:text-white">
                                            {rec.title[lang] || rec.title.en}
                                        </h3>
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles.badgeBg} ${styles.badge}`}
                                        >
                                            {rec.urgency === "critical" && (
                                                <AlertTriangle className="h-2.5 w-2.5" />
                                            )}
                                            {urgLabel[lang]}
                                        </span>
                                    </div>

                                    {/* Plain-language explanation */}
                                    <p className="text-xs text-black/65 dark:text-white/65 leading-relaxed">
                                        {rec.personalReason[lang] || rec.personalReason.en}
                                    </p>

                                    {/* Source evidence + next step — soft-locked on the free tier (Trigger C) */}
                                    {smart && evidenceLocked ? (
                                        <LockedInsightPreview
                                            featureKey="advanced_gap_detection"
                                            triggerSource="recommendation_evidence"
                                            className="mt-2.5"
                                        >
                                            <div className="rounded-xl border border-black/8 bg-white/70 p-2.5 dark:border-white/10 dark:bg-black/30">
                                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/45 dark:text-white/50">
                                                    <FileSearch className="h-3 w-3" />
                                                    {t("Από τα στοιχεία σας", "From your policy data")}
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-black/70 dark:text-white/75">
                                                    {smart.evidence[lang] || smart.evidence.en}
                                                </p>
                                                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-black/70 dark:text-white/75">
                                                    <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary dark:text-mint" />
                                                    <span>
                                                        <span className="font-semibold">{t("Επόμενο βήμα:", "Next step:")}</span>{" "}
                                                        {smart.nextAction[lang] || smart.nextAction.en}
                                                    </span>
                                                </p>
                                            </div>
                                        </LockedInsightPreview>
                                    ) : smart ? (
                                        <>
                                            <div className="mt-2.5 rounded-xl border border-black/8 bg-white/70 p-2.5 dark:border-white/10 dark:bg-black/30">
                                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/45 dark:text-white/50">
                                                    <FileSearch className="h-3 w-3" />
                                                    {t("Από τα στοιχεία σας", "From your policy data")}
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-black/70 dark:text-white/75">
                                                    {smart.evidence[lang] || smart.evidence.en}
                                                </p>
                                            </div>
                                            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-black/70 dark:text-white/75">
                                                <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary dark:text-mint" />
                                                <span>
                                                    <span className="font-semibold">{t("Επόμενο βήμα:", "Next step:")}</span>{" "}
                                                    {smart.nextAction[lang] || smart.nextAction.en}
                                                </span>
                                            </p>
                                        </>
                                    ) : null}

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-black/8 dark:border-white/10 space-y-2">
                                            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
                                                {rec.description[lang] || rec.description.en}
                                            </p>
                                            {rec.matchedProduct && (
                                                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] p-2.5 space-y-1.5">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/45">
                                                        {t("Ενδεικτική επιλογή στην αγορά", "One option on the market")}
                                                    </p>
                                                    <p className="text-xs font-semibold text-black/80 dark:text-white/80">
                                                        {rec.matchedProduct.name[lang] || rec.matchedProduct.name.en}
                                                    </p>
                                                    {rec.matchedProduct.premiumRangeLow != null && rec.matchedProduct.premiumRangeHigh != null && (
                                                        <p className="text-xs text-black/60 dark:text-white/60">
                                                            {t("Ενδεικτικό εύρος ασφαλίστρου", "Typical premium range")}:{" "}
                                                            <span className="font-medium text-primary dark:text-mint">
                                                                €{rec.matchedProduct.premiumRangeLow}–€{rec.matchedProduct.premiumRangeHigh}{t("/έτος", "/yr")}
                                                            </span>
                                                        </p>
                                                    )}
                                                    {rec.matchedProduct.keyBenefits && rec.matchedProduct.keyBenefits.length > 0 && (
                                                        <ul className="text-[11px] text-black/55 dark:text-white/55 space-y-0.5">
                                                            {rec.matchedProduct.keyBenefits.slice(0, 3).map((b, i) => (
                                                                <li key={i} className="flex items-center gap-1.5">
                                                                    <span className="h-1 w-1 rounded-full bg-primary dark:bg-mint flex-shrink-0" />
                                                                    {b[lang] || b.en}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                            {!rec.matchedProduct && rec.estimatedCostEur != null && (
                                                <p className="text-xs font-medium text-black/70 dark:text-white/70">
                                                    {t("Ενδεικτικό κόστος στην αγορά", "Typical market cost")}:{" "}
                                                    <span className="text-primary dark:text-mint font-semibold">
                                                        ~€{rec.estimatedCostEur}
                                                        {t("/έτος", "/year")}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* CTA row */}
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                        {reviewHref ? (
                                            <Link href={reviewHref} className={reviewClasses}>
                                                {reviewLabel}
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                                                className={`${reviewClasses} cursor-pointer`}
                                            >
                                                {reviewLabel}
                                                {isExpanded ? (
                                                    <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDown className="h-3 w-3" />
                                                )}
                                            </button>
                                        )}

                                        {!isAgentCard && (
                                            <Link
                                                href="/agent"
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                                            >
                                                <MessageCircle className="h-3 w-3" />
                                                {t("Ρωτήστε τον σύμβουλό μου", "Ask my agent")}
                                            </Link>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleDismiss(rec.id, "not_relevant")}
                                            className="text-xs text-black/45 hover:text-black/70 hover:underline cursor-pointer dark:text-white/45 dark:hover:text-white/70"
                                        >
                                            {t("Μη σχετικό για εμένα", "Mark as not relevant")}
                                        </button>

                                        {reviewHref && (
                                            <button
                                                type="button"
                                                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                                                className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint hover:underline cursor-pointer"
                                            >
                                                {isExpanded ? t("Λιγότερα", "Less") : t("Περισσότερα", "More")}
                                                {isExpanded ? (
                                                    <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDown className="h-3 w-3" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Show more / less */}
            {visible.length > 3 && (
                <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="mt-4 w-full text-center text-xs font-semibold text-primary dark:text-mint hover:underline cursor-pointer flex items-center justify-center gap-1"
                >
                    {showAll
                        ? t("Εμφάνιση λιγότερων", "Show fewer")
                        : t(
                              `Εμφάνιση όλων (${visible.length})`,
                              `Show all (${visible.length})`
                          )}
                    {showAll ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    )}
                </button>
            )}

            <AiDisclaimer language={language} />
        </div>
    )
}
