"use client"

import { getTranslations } from "@/lib/i18n"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
    AlertTriangle,
    ArrowRight,
    Car,
    ChevronDown,
    ChevronUp,
    Clock,
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
import { formatCurrency } from "@/lib/i18n/format"
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
    /** Evidence ladder of the linked gap — confirmed/validated adds visible
     *  advisor weight; probable/null stays a hedged suggestion (no chip). */
    gapValidationState?: "probable" | "confirmed" | "validated" | null
    /** Life Context Risk Assessment payload. Null on rows written by the
     *  pre-assessment engine — the card then renders without these blocks
     *  rather than inventing them. */
    riskStatus?: "not_applicable" | "needs_review" | "already_covered" | "protection_gap" | "opportunity" | "applicable" | null
    confidence?: "high" | "medium" | "low" | null
    expectedImpact?: { en: string; el: string } | null
    suggestedSolution?: { en: string; el: string } | null
    eligibilityNote?: { en: string; el: string } | null
    /**
     * How SOON, as opposed to how much — `urgency` above is the severity axis
     * despite its name. `no_deadline` carries no reason and renders no badge,
     * which is the point: a list where everything is urgent has no urgency in it.
     */
    timing?: { level: "now" | "weeks" | "months" | "no_deadline"; reason: { en: string; el: string } | null } | null
    /** What the finding rests on — things in their life, and cover held or not. */
    evidence?: Array<{ kind: string; statement: { en: string; el: string } }> | null
    /** What a licensed advisor adds. Null when nothing is unresolved. */
    advisorOpportunity?: { en: string; el: string } | null
    /** What changes for them if they act. */
    customerBenefit?: { en: string; el: string } | null
    /** The change that put this on the screen. Null when we cannot say. */
    cause?: {
        source: "version_event" | "version_trigger" | "exposing_event"
        explanation: { en: string; el: string }
    } | null
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
    /** ≥1 active policy exists — drives the empty-state message/CTA. */
    hasPolicies?: boolean
    /**
     * Registered data-count key for the «N προτάσεις» header (and «Εμφάνιση
     * όλων (N)»). Coverage-insights passes recommendation.openCount (the full
     * active set); the branch page renders a branch-filtered SUBSET, which is a
     * different fact and must pass its own subject-scoped key — the same key
     * on both would make the subset read as the whole set disagreeing with
     * itself.
     */
    countKey?: string
    countSubject?: string
}

// ── LOB icon map ─────────────────────────────────────────────────────

/* The branch icon comes from lib/insurance/branch-icons — the same source the
   wallet, policy table and branch pages use. A private map here meant a life
   policy wore a Landmark in the wallet and a Shield on this screen. */

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
        icon: "text-orange-700 dark:text-orange-400",
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
        icon: "text-slate-500",
    },
}

/**
 * One consistent priority scale.
 *
 * This read "Critical / High priority / Recommended / Nice to have" — two
 * priority tiers and two value judgements in the same set. "Nice to have" is
 * the product deciding a coverage gap does not really matter for this person,
 * which is exactly the personalised judgement its own methodology disclaimer
 * says it does not make. All four are priority tiers now.
 */
const URGENCY_KEYS = {
    critical: "recPriorityCritical",
    high: "recPriorityHigh",
    medium: "recPriorityMedium",
    low: "recPriorityLow",
} as const

// ── Component ────────────────────────────────────────────────────────

export function RecommendationCards({
    recommendations,
    language,
    profileIncomplete = false,
    smartContent = {},
    tier,
    hasPolicies = true,
    countKey,
    countSubject,
}: RecommendationCardsProps) {
    const evidenceLocked = tier === "free"
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)

    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const home = getTranslations(lang).dashboard.home

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
        // Three honest empty states — never "preparing" indefinitely:
        //  • no policies → add one;
        //  • profile incomplete → complete it (recommendations sharpen);
        //  • otherwise → the user is genuinely well covered right now.
        const wellCovered = hasPolicies && !profileIncomplete
        return (
            <EmptyState
                icon={Lightbulb}
                headline={
                    !hasPolicies
                        ? t("Προσθέστε το πρώτο σας ασφαλιστήριο", "Add your first policy")
                        : profileIncomplete
                            ? t("Οι προτάσεις σας ετοιμάζονται", "Your recommendations are on the way")
                            : t("Φαίνεστε καλά καλυμμένος/η", "You look well covered")
                }
                description={
                    !hasPolicies
                        ? t("Προσθέστε ένα ασφαλιστήριο για να λάβετε εξατομικευμένες προτάσεις.", "Add a policy to get personalized recommendations.")
                        : profileIncomplete
                            ? t("Όσο πληρέστερο το προφίλ και τα ασφαλιστήριά σας, τόσο πιο εύστοχες οι προτάσεις της AI.", "The more complete your profile and policies, the sharper the AI's recommendations.")
                            : t("Δεν υπάρχουν προτάσεις αυτή τη στιγμή. Ανανεώστε την ανάλυση για επανέλεγχο.", "No recommendations right now. Refresh the analysis to re-check.")
                }
                cta={
                    !hasPolicies
                        ? { label: t("Προσθήκη ασφαλιστηρίου", "Add a policy"), href: "/wallet/add" }
                        : profileIncomplete
                            ? {
                                  label: t("Συμπλήρωση προφίλ κινδύνου", "Complete your risk profile"),
                                  onClick: () =>
                                      document
                                          .getElementById("risk-profile-wizard")
                                          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                              }
                            : { label: t("Επιστροφή στο πορτοφόλι", "Back to wallet"), href: "/wallet" }
                }
                previewLabel={wellCovered ? undefined : t("Παράδειγμα", "Example")}
                preview={
                    wellCovered ? undefined : (
                        <RecommendationPreviewCard
                            title={t("Αύξηση κάλυψης κατοικίας", "Increase home coverage")}
                            meta={t(
                                "Η κάλυψη περιεχομένου φαίνεται χαμηλή για το προφίλ σας.",
                                "Your contents coverage looks low for your profile."
                            )}
                            urgencyLabel={home.recPriorityMedium}
                        />
                    )
                }
                trust={t(
                    "Ενημερωτικές προτάσεις — όχι ασφαλιστική συμβουλή",
                    "Informational suggestions — not insurance advice"
                )}
            />
        )
    }

    return (
        <div className="pw-card pw-pad">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 dark:bg-amber-900/25">
                    <Lightbulb className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {t("Προτάσεις κάλυψης", "Coverage Recommendations")}
                    </h2>
                    {/* On coverage-insights this is the SAME set the dashboard
                        hero's «N κατηγορίες κινδύνου» states — one key, two
                        surfaces. The branch page passes its own subset key. */}
                    <p className="text-xs text-muted-foreground" data-count={countKey} data-count-subject={countSubject}>
                        {t(
                            `${visible.length} προτάσεις βασισμένες στο προφίλ σας`,
                            `${visible.length} recommendation${visible.length !== 1 ? "s" : ""} based on your profile`
                        )}
                    </p>
                </div>
            </div>

            {/* The dashboard's gaps widget already qualified these priorities as
                profile-based rather than a risk grade; this screen — the deeper
                one, where the user comes to act — showed the same badges bare, so
                "Κρίσιμη προτεραιότητα" read as a verdict on their risk. Same
                sentence, same meaning, on both surfaces. */}
            <p className="mb-3 text-caption leading-snug text-muted-foreground">
                {home.recPriorityNote}
            </p>

            {/* Cards */}
            <div className="space-y-3">
                {displayed.map((rec) => {
                    const styles = URGENCY_STYLES[rec.urgency] || URGENCY_STYLES.low
                    const Icon = getBranchIcon(rec.lineOfBusiness)
                    const urgKey = URGENCY_KEYS[rec.urgency as keyof typeof URGENCY_KEYS] ?? URGENCY_KEYS.low
                    const urgLabel = home[urgKey]
                    const isExpanded = expandedId === rec.id
                    const smart = rec.ruleId ? smartContent[rec.ruleId] : undefined
                    const reviewHref = smart?.reviewHref ?? null
                    const isAgentCard = rec.ruleId === "no_agent_connected"
                    const reviewLabel = t("Έλεγχος", "Review this")
                    // min-h-11: `py-1.5` on `text-micro` renders 28px tall, and this
                    // is a real navigation control, not a badge — it measured
                    // 88x28 on /protection at 320/390/430.
                    const reviewClasses =
                        "inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-micro font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"

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
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-kicker font-semibold uppercase tracking-wider ${styles.badgeBg} ${styles.badge}`}
                                        >
                                            {rec.urgency === "critical" && (
                                                <AlertTriangle className="h-2.5 w-2.5" />
                                            )}
                                            {urgLabel}
                                        </span>
                                        {/* The DEADLINE, which the badge above never carried
                                            despite its name. Rendered only when one exists —
                                            `no_deadline` is the common case, and a list where
                                            everything is urgent has no urgency in it. The clock
                                            icon and the outline keep it readable as a different
                                            question from the severity chip beside it. */}
                                        {rec.timing && rec.timing.level !== "no_deadline" && (
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-kicker font-semibold uppercase tracking-wider ${
                                                    rec.timing.level === "now"
                                                        ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300"
                                                        : "border-black/20 text-black/70 dark:border-white/25 dark:text-white/70"
                                                }`}
                                            >
                                                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                                                {rec.timing.level === "now"
                                                    ? t("Άμεσα", "Act now")
                                                    : rec.timing.level === "weeks"
                                                      ? t("Εντός εβδομάδων", "Within weeks")
                                                      : t("Εντός μηνών", "Within months")}
                                            </span>
                                        )}
                                        {/* Advisor weight from the evidence ladder — shown only
                                            once a human stands behind the finding; a probable
                                            (AI-only) finding earns no extra authority chip. */}
                                        {/* What the assessment concluded, and how
                                            much of it rests on answered facts. An
                                            urgency badge alone says how loud, not
                                            how sure. */}
                                        {rec.riskStatus === "opportunity" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-kicker font-semibold uppercase tracking-wider border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                                {t("Ευκαιρία", "Opportunity")}
                                            </span>
                                        )}
                                        {rec.riskStatus === "protection_gap" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-kicker font-semibold uppercase tracking-wider border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                                                {t("Κενό προστασίας", "Protection gap")}
                                            </span>
                                        )}
                                        {rec.confidence && (
                                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-kicker text-muted-foreground">
                                                {rec.confidence === "high"
                                                    ? t("Υψηλή βεβαιότητα", "High confidence")
                                                    : rec.confidence === "medium"
                                                      ? t("Μεσαία βεβαιότητα", "Medium confidence")
                                                      : t("Χαμηλή βεβαιότητα", "Low confidence")}
                                            </span>
                                        )}
                                        {(rec.gapValidationState === "confirmed" || rec.gapValidationState === "validated") && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-kicker font-semibold uppercase tracking-wider border border-primary/25 bg-primary/5 text-primary/90 dark:border-primary/30 dark:bg-primary/10 dark:text-mint/90">
                                                {rec.gapValidationState === "validated" ? home.recAdvisorValidated : home.recAdvisorConfirmed}
                                            </span>
                                        )}
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
                                                <p className="flex items-center gap-1.5 text-kicker font-bold uppercase tracking-wider text-muted-foreground">
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
                                                <p className="flex items-center gap-1.5 text-kicker font-bold uppercase tracking-wider text-muted-foreground">
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
                                            {/* Why this is on your screen at all — first, because
                                                it is the question a reader has before any of the
                                                detail below can matter. Links to the timeline,
                                                where the causing change sits in context. */}
                                            {rec.cause && (
                                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 dark:border-primary/25 dark:bg-primary/10">
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-primary/90 dark:text-mint/90">
                                                        {t("Γιατί το βλέπετε", "Why you are seeing this")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-black/75 dark:text-white/75">
                                                        {rec.cause.explanation[lang] || rec.cause.explanation.en}
                                                    </p>
                                                    <Link
                                                        href="/account/history"
                                                        className="mt-1 inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                                                    >
                                                        {t("Δείτε το στο χρονολόγιο", "See it on your timeline")}
                                                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                                                    </Link>
                                                </div>
                                            )}

                                            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
                                                {rec.description[lang] || rec.description.en}
                                            </p>

                                            {/* The badge says there is a deadline; this says what
                                                it is. A deadline asserted without a reason is
                                                just pressure. */}
                                            {rec.timing?.reason && (
                                                <div>
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Γιατί τώρα", "Why now")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-black/70 dark:text-white/70">
                                                        {rec.timing.reason[lang] || rec.timing.reason.en}
                                                    </p>
                                                </div>
                                            )}
                                            {rec.expectedImpact && (
                                                <div>
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Πιθανή επίπτωση", "Expected impact")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-black/70 dark:text-white/70">
                                                        {rec.expectedImpact[lang] || rec.expectedImpact.en}
                                                    </p>
                                                </div>
                                            )}
                                            {rec.suggestedSolution && (
                                                <div>
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Τι το καλύπτει", "What covers it")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-black/70 dark:text-white/70">
                                                        {rec.suggestedSolution[lang] || rec.suggestedSolution.en}
                                                    </p>
                                                </div>
                                            )}
                                            {/* What this rests on. Structured evidence from the
                                                risk graph — the things in their life that produce
                                                the risk, and the cover that does or does not
                                                answer it. A claim the reader can check. */}
                                            {rec.evidence && rec.evidence.length > 0 && (
                                                <div>
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Σε τι βασιζόμαστε", "What this rests on")}
                                                    </p>
                                                    <ul className="mt-1 space-y-1">
                                                        {rec.evidence.map((item, i) => (
                                                            <li
                                                                key={`${item.kind}-${i}`}
                                                                className="flex items-start gap-2 text-xs leading-relaxed text-black/70 dark:text-white/70"
                                                            >
                                                                <span
                                                                    className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-black/30 dark:bg-white/30"
                                                                    aria-hidden="true"
                                                                />
                                                                <span className="min-w-0 [overflow-wrap:anywhere]">
                                                                    {item.statement[lang] || item.statement.en}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {rec.customerBenefit && (
                                                <div>
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Τι κερδίζετε", "What you get")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-black/70 dark:text-white/70">
                                                        {rec.customerBenefit[lang] || rec.customerBenefit.en}
                                                    </p>
                                                </div>
                                            )}

                                            {/* What an advisor adds — stated as their work, not
                                                as a pitch, and only where something is genuinely
                                                unresolved. Under IDD / Law 4583/2018 the
                                                regulated act is the advice, not this analysis. */}
                                            {rec.advisorOpportunity && (
                                                <div className="rounded-lg border border-black/10 bg-black/[0.02] p-2.5 dark:border-white/12 dark:bg-white/[0.03]">
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Πού βοηθά ένας σύμβουλος", "Where an advisor helps")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-black/70 dark:text-white/70">
                                                        {rec.advisorOpportunity[lang] || rec.advisorOpportunity.en}
                                                    </p>
                                                </div>
                                            )}

                                            {rec.eligibilityNote && (
                                                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-900/40 dark:bg-amber-900/15">
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                                        {t("Προσοχή στην αγορά", "Market reality")}
                                                    </p>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200/90">
                                                        {rec.eligibilityNote[lang] || rec.eligibilityNote.en}
                                                    </p>
                                                </div>
                                            )}
                                            {rec.matchedProduct && (
                                                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] p-2.5 space-y-1.5">
                                                    <p className="text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t("Ενδεικτική επιλογή στην αγορά", "One option on the market")}
                                                    </p>
                                                    <p className="text-xs font-semibold text-black/80 dark:text-white/80">
                                                        {rec.matchedProduct.name[lang] || rec.matchedProduct.name.en}
                                                    </p>
                                                    {rec.matchedProduct.premiumRangeLow != null && rec.matchedProduct.premiumRangeHigh != null && (
                                                        <p className="text-xs text-black/60 dark:text-white/60">
                                                            {t("Ενδεικτικό εύρος ασφαλίστρου", "Typical premium range")}:{" "}
                                                            <span className="font-medium text-primary dark:text-mint">
                                                                {formatCurrency(rec.matchedProduct.premiumRangeLow, lang, { decimals: 0 })}–{formatCurrency(rec.matchedProduct.premiumRangeHigh, lang, { decimals: 0 })}{t("/έτος", "/yr")}
                                                            </span>
                                                        </p>
                                                    )}
                                                    {rec.matchedProduct.keyBenefits && rec.matchedProduct.keyBenefits.length > 0 && (
                                                        <ul className="text-micro text-muted-foreground space-y-0.5">
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
                                            {/* Was "Ενδεικτικό κόστος στην αγορά" / "Typical market cost" — a
                                                quantified claim about the Greek market from a flat table of eleven
                                                numbers that ignores age, vehicle, sum insured and every other
                                                factor that actually prices a policy. It is an order of magnitude,
                                                and now says so. */}
                                            {!rec.matchedProduct && rec.estimatedCostEur != null && (
                                                <p className="text-xs font-medium text-black/70 dark:text-white/70">
                                                    {t("Τάξη μεγέθους ασφαλίστρου", "Rough order of magnitude")}:{" "}
                                                    <span className="text-primary dark:text-mint font-semibold">
                                                        ~{formatCurrency(rec.estimatedCostEur, lang, { decimals: 0 })}
                                                        {t("/έτος", "/year")}
                                                    </span>
                                                    <span className="block text-muted-foreground">
                                                        {t(
                                                            "Το πραγματικό ασφάλιστρο εξαρτάται από τα δικά σας στοιχεία (ηλικία, ασφαλιζόμενο κεφάλαιο, ιστορικό).",
                                                            "Your actual premium depends on your own details (age, sum insured, history)."
                                                        )}
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
                                                className="pw-inline-action inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                                            >
                                                <MessageCircle className="inline-flex min-h-[24px] items-center h-3 w-3" />
                                                {t("Ρωτήστε τον σύμβουλό μου", "Ask my agent")}
                                            </Link>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleDismiss(rec.id, "not_relevant")}
                                            className="inline-flex min-h-[24px] items-center text-xs text-black/55 hover:text-black/70 hover:underline cursor-pointer dark:text-white/60 dark:hover:text-white/70"
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
                    {showAll ? (
                        t("Εμφάνιση λιγότερων", "Show fewer")
                    ) : (
                        <span data-count={countKey} data-count-subject={countSubject}>
                            {t(
                                `Εμφάνιση όλων (${visible.length})`,
                                `Show all (${visible.length})`
                            )}
                        </span>
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
