"use client"

/**
 * The customer's risk intelligence surface.
 *
 * Ordered by what a reader needs first: how well we understand them, what we are
 * watching, then the nine dimensions, then the household and the longer view.
 * The health index leads deliberately — every claim below it rests on how much
 * of their life we have actually established, and putting that at the bottom
 * would let the rest read as more certain than it is.
 */

import Link from "next/link"
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Eye,
    Minus,
    TrendingDown,
    TrendingUp,
    Users,
} from "lucide-react"
import { RiskDnaPanel, type DimensionView } from "./RiskDnaPanel"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

interface WatchView {
    id: string
    label: Bilingual
    verdict: "clear" | "attention" | "action"
    detail: Bilingual | null
    /**
     * `detail`, segmented (WatchSignal.detailParts): a part stating a count or
     * fact carries its registered key so this component can mark the element
     * with data-count / data-fact — «5 ασφαλιστήρια έχουν ήδη λήξει» here and
     * on the dashboard hero is ONE fact under one key (§6.7).
     */
    detailParts?: Array<{
        text: Bilingual
        countKey?: string
        countValue?: number
        factKey?: string
        factValue?: number
    }> | null
    action: Bilingual | null
    confidence: "high" | "medium" | "low"
}

interface TrendView {
    dimension: string
    label: Bilingual
    direction: "improving" | "worsening" | "steady" | "unknown"
    netDelta: number | null
    whatChanged: Bilingual | null
}

interface PredictionView {
    id: string
    kind: "observation" | "forecast"
    label: Bilingual
    detail: Bilingual
    probability: number | null
    /** When the detail states a count, its registered key (PredictionSignal). */
    countKey?: string
    countValue?: number
}

export interface RiskIntelligenceViewProps {
    language: "en" | "el"
    health: {
        index: number | null
        band: "strong" | "fair" | "thin" | "unknown"
        components: Array<{ id: string; label: Bilingual; value: number; weight: number }>
        whatChanged: Bilingual | null
        whyItMatters: Bilingual
        nextAction: Bilingual | null
        confidence: "high" | "medium" | "low"
    }
    household: {
        memberCount: number
        dependantCount: number
        assetCount: number
        obligationCount: number
        sharedExposures: Array<{ dimension: string; label: Bilingual; openCount: number }>
        whyItMatters: Bilingual
        nextAction: Bilingual | null
    }
    dimensions: DimensionView[]
    trends: TrendView[]
    watch: WatchView[]
    predictions: PredictionView[]
    /**
     * "What we are protecting" — rendered by the page so this component stays
     * free of the graph's data shape. Sits after the dimensions: areas of life
     * first, then the specific things inside them.
     */
    graphPanel?: React.ReactNode
    /**
     * Where health.nextAction sends the reader. Defaults to the wizard on
     * /coverage-insights (the pre-§4.2 home); /protection passes its own
     * in-page anchor because the wizard renders on the same surface there.
     */
    wizardHref?: string
}


export function RiskIntelligenceView({
    language,
    health,
    household,
    dimensions,
    trends,
    watch,
    predictions,
    graphPanel,
    wizardHref,
}: RiskIntelligenceViewProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)

    // `bandLabel` and `BAND_TONE` lived here: «Καλή εικόνα» / «Μερική εικόνα» /
    // «Περιορισμένη εικόνα» / «Άγνωστη», and the colour that carried the
    // verdict. Both deleted with the metric (H-005). Left as dead code they
    // would have kept four Greek strings in the frozen inventory for a feature
    // that no longer exists, which is the same trap as the sixteen unreachable
    // mail templates.

    // Only signals with something to say lead; `clear` ones follow, because a
    // watch that hides its clear results cannot be told from a broken one.
    const active = watch.filter((w) => w.verdict !== "clear")
    const clear = watch.filter((w) => w.verdict === "clear")
    const movingTrends = trends.filter((tr) => tr.direction === "improving" || tr.direction === "worsening")

    return (
        <div className="space-y-6">
            {/* ── The completeness metric was REMOVED here (H-005) ──────
                «Πόσο καλά σας γνωρίζουμε»: a 0-100 index, a coloured band
                verdict («Καλή εικόνα»), and eight component percentages with
                progress bars. §2.4 says one score, not two, and the owner
                answered H-005 on 2026-08-25: it should not exist.

                Deleted whole rather than de-verdicted. Keeping the components
                would have kept the score in pieces — eight percentages IS the
                index, distributed. `whyItMatters` went with it: its copy reads
                "…for THIS to mean anything yet", prose about a number that is
                no longer there.

                What survives is the one thing that was never a score. The
                comment below called it "the one place a new customer is told
                what to do first, so it has to be a control", and that is still
                true — «Απαντήστε σε μερικές ακόμη ερωτήσεις για την κατάστασή
                σας» tells someone what to do without ranking them for not
                having done it yet. */}
            {/* The card exists only when it has something to say. `nextAction`
                is null once the weakest area is answered well enough, and an
                empty bordered box is a surface telling the reader nothing while
                occupying the space where a finding would go. */}
            {health.nextAction && (
                <div className="pw-card pw-pad">
                    <Link
                        href={wizardHref ?? "/protection#risk-profile-wizard"}
                        className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                    >
                        {health.nextAction[lang] || health.nextAction.en}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                </div>
            )}

            {/* ── Continuous monitoring ─────────────────────────────── */}
            <div className="pw-card pw-pad">
                <div className="mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {t("Τι παρακολουθούμε", "What we are watching")}
                    </h2>
                </div>

                <ul className="space-y-2.5">
                    {[...active, ...clear].map((signal) => (
                        <li key={signal.id} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex-shrink-0">
                                {signal.verdict === "clear" ? (
                                    <CheckCircle2 className="h-4 w-4 text-primary dark:text-mint" aria-hidden="true" />
                                ) : (
                                    <AlertTriangle
                                        className={`h-4 w-4 ${signal.verdict === "action" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-black dark:text-white">
                                    {signal.label[lang] || signal.label.en}
                                </span>
                                {(signal.detailParts?.length || signal.detail) && (
                                    <span className="mt-0.5 block text-caption leading-relaxed text-black/70 dark:text-white/70 [overflow-wrap:anywhere]">
                                        {signal.detailParts?.length
                                            ? signal.detailParts.map((part, i) => (
                                                  <span key={i} data-count={part.countKey} data-fact={part.factKey}>
                                                      {part.text[lang] || part.text.en}
                                                  </span>
                                              ))
                                            : signal.detail
                                              ? signal.detail[lang] || signal.detail.en
                                              : null}
                                    </span>
                                )}
                                {signal.action && (
                                    <span className="mt-0.5 block text-caption font-semibold text-primary dark:text-mint">
                                        {signal.action[lang] || signal.action.en}
                                    </span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* ── Risk DNA ──────────────────────────────────────────── */}
            <RiskDnaPanel dimensions={dimensions} language={lang} />

            {graphPanel}

            {/* ── Household ─────────────────────────────────────────── */}
            {/* Hidden when we know nothing about it. Every other panel on this
                page self-hides when empty; this one rendered "People 1,
                Dependants 0, Assets 0, Obligations 0" at a customer who had
                told us nothing, which is four zeros pretending to be a finding. */}
            {(household.dependantCount > 0 ||
                household.assetCount > 0 ||
                household.obligationCount > 0) && (
            <div className="pw-card pw-pad">
                <div className="mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {t("Το νοικοκυριό", "Your household")}
                    </h2>
                </div>

                {/* Two columns only from 400px: four stat tiles at 320px leave
                    ~70px each, which cannot hold a Greek label. */}
                {/* The same four facts the risk-graph headline states, under the
                    same keys — the cross-check is the point: both derive from
                    one graph, and the attributes make an eventual drift a
                    measured failure instead of an argument. */}
                <dl className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                    <Stat label={t("Μέλη", "People")} value={household.memberCount} countKey="household.memberCount" />
                    <Stat label={t("Εξαρτώμενα", "Dependants")} value={household.dependantCount} countKey="household.dependantCount" />
                    <Stat label={t("Περιουσιακά στοιχεία", "Assets")} value={household.assetCount} countKey="household.assetCount" />
                    <Stat label={t("Υποχρεώσεις", "Obligations")} value={household.obligationCount} countKey="household.obligationCount" />
                </dl>

                <p className="mt-3 text-caption leading-relaxed text-black/70 dark:text-white/70">
                    {household.whyItMatters[lang] || household.whyItMatters.en}
                </p>
                {household.nextAction && (
                    <p className="mt-1.5 text-caption font-semibold text-primary dark:text-mint">
                        {household.nextAction[lang] || household.nextAction.en}
                    </p>
                )}
            </div>
            )}

            {/* ── Trends ────────────────────────────────────────────── */}
            {movingTrends.length > 0 && (
                <div className="pw-card pw-pad">
                    <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">
                        {t("Πού κινείται", "Which way it is moving")}
                    </h2>
                    <ul className="space-y-2">
                        {movingTrends.map((trend) => (
                            <li key={trend.dimension} className="flex items-start gap-2.5">
                                <span className="mt-0.5 flex-shrink-0">
                                    {trend.direction === "improving" ? (
                                        <TrendingUp className="h-4 w-4 text-primary dark:text-mint" aria-hidden="true" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                                    )}
                                </span>
                                <span className="min-w-0 text-caption leading-relaxed text-black/75 dark:text-white/75 [overflow-wrap:anywhere]">
                                    {trend.whatChanged
                                        ? trend.whatChanged[lang] || trend.whatChanged.en
                                        : trend.label[lang] || trend.label.en}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Prediction hooks ──────────────────────────────────── */}
            {predictions.length > 0 && (
                <div className="pw-card pw-pad">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {t("Τι βλέπουμε μπροστά", "What we can see ahead")}
                    </h2>
                    {/* Stated as observations, not forecasts. "You are 64 with no
                        pension arrangement" is a fact about today; "73% likely to
                        retire within 18 months" is a number this product cannot
                        honestly produce yet. */}
                    <p className="mt-1 text-caption text-muted-foreground">
                        {t(
                            "Παρατηρήσεις για το σήμερα που αφορούν το αύριο — όχι προβλέψεις.",
                            "Observations about today that bear on tomorrow — not forecasts.",
                        )}
                    </p>
                    <ul className="mt-3 space-y-2.5">
                        {predictions.map((prediction) => (
                            <li key={prediction.id}>
                                <p className="text-sm font-semibold text-black dark:text-white">
                                    {prediction.label[lang] || prediction.label.en}
                                </p>
                                <p
                                    className="mt-0.5 text-caption leading-relaxed text-black/70 dark:text-white/70 [overflow-wrap:anywhere]"
                                    data-count={prediction.countKey}
                                >
                                    {prediction.detail[lang] || prediction.detail.en}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

function Stat({ label, value, countKey }: { label: string; value: number; countKey?: string }) {
    return (
        <div className="rounded-xl border border-black/8 px-3 py-2 dark:border-white/10">
            <dt className="text-kicker uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="text-lg font-bold tabular-nums text-black dark:text-white" data-count={countKey}>{value}</dd>
        </div>
    )
}
