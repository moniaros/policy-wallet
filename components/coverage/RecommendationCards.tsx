"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
    AlertTriangle,
    Car,
    ChevronDown,
    ChevronUp,
    Heart,
    Home,
    Lightbulb,
    PawPrint,
    Plane,
    Scale,
    Shield,
    ShieldAlert,
    Umbrella,
    X,
} from "lucide-react"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

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
}: RecommendationCardsProps) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)

    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)

    const visible = recommendations.filter((r) => !dismissedIds.has(r.id))
    const displayed = showAll ? visible : visible.slice(0, 3)

    async function handleDismiss(id: string) {
        setDismissedIds((prev) => new Set(prev).add(id))
        try {
            const res = await fetch(`/api/v1/recommendations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "dismiss", reason: "user_dismissed" }),
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

    if (visible.length === 0) return null

    return (
        <div className="pw-card rounded-3xl p-6">
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

                                    <p className="text-xs text-black/65 dark:text-white/65 leading-relaxed">
                                        {rec.personalReason[lang] || rec.personalReason.en}
                                    </p>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-black/8 dark:border-white/10 space-y-2">
                                            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
                                                {rec.description[lang] || rec.description.en}
                                            </p>
                                            {rec.matchedProduct && (
                                                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] p-2.5 space-y-1.5">
                                                    <p className="text-xs font-semibold text-black/80 dark:text-white/80">
                                                        {rec.matchedProduct.name[lang] || rec.matchedProduct.name.en}
                                                    </p>
                                                    {rec.matchedProduct.premiumRangeLow != null && rec.matchedProduct.premiumRangeHigh != null && (
                                                        <p className="text-xs text-black/60 dark:text-white/60">
                                                            {t("Εύρος ασφαλίστρου", "Premium range")}:{" "}
                                                            <span className="font-medium text-[#1FDC86]">
                                                                €{rec.matchedProduct.premiumRangeLow}–€{rec.matchedProduct.premiumRangeHigh}{t("/έτος", "/yr")}
                                                            </span>
                                                        </p>
                                                    )}
                                                    {rec.matchedProduct.keyBenefits && rec.matchedProduct.keyBenefits.length > 0 && (
                                                        <ul className="text-[11px] text-black/55 dark:text-white/55 space-y-0.5">
                                                            {rec.matchedProduct.keyBenefits.slice(0, 3).map((b, i) => (
                                                                <li key={i} className="flex items-center gap-1.5">
                                                                    <span className="h-1 w-1 rounded-full bg-[#1FDC86] flex-shrink-0" />
                                                                    {b[lang] || b.en}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                            {!rec.matchedProduct && rec.estimatedCostEur != null && (
                                                <p className="text-xs font-medium text-black/70 dark:text-white/70">
                                                    {t("Εκτιμώμενο κόστος", "Estimated cost")}:{" "}
                                                    <span className="text-[#1FDC86] font-semibold">
                                                        ~€{rec.estimatedCostEur}
                                                        {t("/έτος", "/year")}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions row */}
                                    <div className="flex items-center gap-3 mt-2.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : rec.id)
                                            }
                                            className="text-xs font-semibold text-[#1FDC86] hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            {isExpanded
                                                ? t("Λιγότερα", "Less")
                                                : t("Περισσότερα", "More")}
                                            {isExpanded ? (
                                                <ChevronUp className="h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Dismiss button */}
                                <button
                                    type="button"
                                    onClick={() => handleDismiss(rec.id)}
                                    aria-label={t("Απόρριψη πρότασης", "Dismiss recommendation")}
                                    className="flex-shrink-0 p-1 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
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
                    className="mt-4 w-full text-center text-xs font-semibold text-[#1FDC86] hover:underline cursor-pointer flex items-center justify-center gap-1"
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
