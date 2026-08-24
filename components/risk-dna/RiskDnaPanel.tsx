"use client"

/**
 * Risk DNA — the signature.
 *
 * **Not a radar chart.** A nine-spoke radar is unreadable below about 400px, its
 * area is a visual composite the model explicitly refuses to compute, and it
 * gives a customer no way to act on any single spoke. Nine horizontal bars carry
 * the same nine numbers, read top to bottom on a phone, and each one opens.
 *
 * Every row answers the five questions this platform asks of every feature:
 * what changed, why it matters, what happens next, how sure we are, and what
 * acting would actually do to the score.
 *
 * A dimension that does not apply shows no bar at all rather than an empty one.
 * A childless renter has no Family exposure, and rendering that as 0% would
 * report the safest possible position as the worst.
 */

import { useState } from "react"
import { ChevronDown, Minus, TrendingDown, TrendingUp } from "lucide-react"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

type Trend = "improving" | "worsening" | "steady" | "unknown"
type Urgency = "now" | "soon" | "watch" | "none"

export interface DimensionView {
    id: string
    label: Bilingual
    question: Bilingual
    score: number | null
    coarse: boolean
    confidence: "high" | "medium" | "low"
    confidenceLimit: Bilingual | null
    trend: Trend
    trendDelta: number | null
    urgency: Urgency
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual | null
    ifActioned: { points: number; statement: Bilingual } | null
    openCount: number
    applicableCount: number
    risks: Array<{
        riskId: string
        name: Bilingual
        status: string
        priority: string
        whyItMatters: Bilingual
        whyItApplies: Bilingual
        actions: Array<{ kind: string; label: Bilingual }>
        coveredBy: string[]
    }>
}

interface RiskDnaPanelProps {
    dimensions: DimensionView[]
    language: "en" | "el"
}

/** Bar colour follows the SCORE, so the page is scannable without reading. */
function barTone(score: number | null): string {
    if (score === null) return "bg-black/15 dark:bg-white/15"
    if (score >= 80) return "bg-primary dark:bg-mint"
    if (score >= 50) return "bg-amber-500"
    return "bg-red-500"
}

export function RiskDnaPanel({ dimensions, language }: RiskDnaPanelProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const [openId, setOpenId] = useState<string | null>(null)

    // A dimension that does not apply is not a weakness — it is the absence of
    // an exposure, and it is shown separately rather than scored.
    const scored = dimensions.filter((d) => d.score !== null)
    const notApplicable = dimensions.filter((d) => d.score === null)

    if (scored.length === 0) return null

    const confidenceLabel = (c: DimensionView["confidence"]) =>
        c === "high"
            ? t("Υψηλή βεβαιότητα", "High confidence")
            : c === "medium"
              ? t("Μεσαία βεβαιότητα", "Medium confidence")
              : t("Χαμηλή βεβαιότητα", "Low confidence")

    return (
        <div className="pw-card pw-pad">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                    {t("Το προφίλ κινδύνου σας", "Your risk profile")}
                </h2>
                <p className="text-caption text-muted-foreground">
                    {t(
                        "Εννέα διαστάσεις της ζωής σας. Δεν αθροίζονται σε έναν βαθμό — είναι φακοί, όχι βαθμολόγιο.",
                        "Nine dimensions of your life. They do not add up to one number — they are lenses, not a scoreboard.",
                    )}
                </p>
            </div>

            <ul className="space-y-1">
                {scored.map((dimension) => {
                    const isOpen = openId === dimension.id
                    const TrendIcon =
                        dimension.trend === "improving"
                            ? TrendingUp
                            : dimension.trend === "worsening"
                              ? TrendingDown
                              : Minus

                    return (
                        <li key={dimension.id}>
                            <button
                                type="button"
                                onClick={() => setOpenId(isOpen ? null : dimension.id)}
                                aria-expanded={isOpen}
                                className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-sm font-semibold text-black dark:text-white">
                                            {dimension.label[lang] || dimension.label.en}
                                        </span>
                                        <span className="flex flex-shrink-0 items-center gap-1.5">
                                            {dimension.trend !== "unknown" && (
                                                <TrendIcon
                                                    className={`h-3 w-3 ${
                                                        dimension.trend === "improving"
                                                            ? "text-primary dark:text-mint"
                                                            : dimension.trend === "worsening"
                                                              ? "text-red-600 dark:text-red-400"
                                                              : "text-muted-foreground"
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span
                                                className="text-sm font-bold tabular-nums text-black dark:text-white"
                                                data-fact="riskDimension.score"
                                                data-fact-subject={dimension.id}
                                            >
                                                {dimension.score}
                                            </span>
                                        </span>
                                    </span>

                                    {/* The bar. Given an explicit role so the number is
                                        not the only way to read it. */}
                                    <span
                                        role="meter"
                                        aria-valuenow={dimension.score ?? 0}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={dimension.label[lang] || dimension.label.en}
                                        className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
                                    >
                                        <span
                                            className={`block h-full rounded-full transition-all ${barTone(dimension.score)}`}
                                            style={{ width: `${Math.max(2, dimension.score ?? 0)}%` }}
                                        />
                                    </span>
                                </span>

                                <ChevronDown
                                    className={`h-4 w-4 flex-shrink-0 text-black/35 transition-transform dark:text-white/35 ${isOpen ? "rotate-180" : ""}`}
                                    aria-hidden="true"
                                />
                            </button>

                            {isOpen && (
                                <div className="space-y-3 rounded-xl bg-black/[0.02] px-3 py-3 dark:bg-white/[0.03]">
                                    <p className="text-caption italic leading-relaxed text-black/60 dark:text-white/60">
                                        {dimension.question[lang] || dimension.question.en}
                                    </p>

                                    <Block
                                        title={t("Γιατί έχει σημασία", "Why it matters")}
                                        body={dimension.whyItMatters}
                                        lang={lang}
                                    />
                                    <Block
                                        title={t("Τι άλλαξε", "What changed")}
                                        body={dimension.whatChanged}
                                        lang={lang}
                                        fallback={t(
                                            "Δεν υπάρχει ακόμη ιστορικό για σύγκριση.",
                                            "There is no history to compare against yet.",
                                        )}
                                    />
                                    <Block
                                        title={t("Τι ακολουθεί", "What happens next")}
                                        body={dimension.nextAction}
                                        lang={lang}
                                        fallback={t("Τίποτα ανοιχτό εδώ.", "Nothing open here.")}
                                    />

                                    {dimension.ifActioned && (
                                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 dark:border-primary/25 dark:bg-primary/10">
                                            <p className="text-kicker font-bold uppercase tracking-wider text-primary/90 dark:text-mint/90">
                                                {t("Τι θα βελτίωνε", "What that would improve")}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-black/75 dark:text-white/75">
                                                {dimension.ifActioned.statement[lang] ||
                                                    dimension.ifActioned.statement.en}
                                            </p>
                                        </div>
                                    )}

                                    {/* The risks themselves, inside the dimension
                                        they concern. This replaces a separate flat
                                        list of all 21 — two renderings of one
                                        assessment that a customer had to reconcile
                                        for themselves. */}
                                    {dimension.risks.length > 0 && (
                                        <div>
                                            <p className="text-kicker font-bold uppercase tracking-widest text-muted-foreground">
                                                {t("Τι περιλαμβάνει", "What this covers")}
                                            </p>
                                            <ul className="mt-1 space-y-2">
                                                {dimension.risks.map((risk) => {
                                                    const isOpen =
                                                        risk.status === "protection_gap" ||
                                                        risk.status === "opportunity"
                                                    return (
                                                        <li key={risk.riskId} className="flex items-start gap-2">
                                                            <span
                                                                className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                                                    isOpen
                                                                        ? "bg-amber-500"
                                                                        : "bg-primary dark:bg-mint"
                                                                }`}
                                                                aria-hidden="true"
                                                            />
                                                            <span className="min-w-0">
                                                                <span className="block text-xs font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                                                    {risk.name[lang] || risk.name.en}
                                                                </span>
                                                                <span className="mt-0.5 block text-caption leading-relaxed text-black/65 dark:text-white/60 [overflow-wrap:anywhere]">
                                                                    {isOpen
                                                                        ? risk.whyItMatters[lang] || risk.whyItMatters.en
                                                                        : risk.whyItApplies[lang] || risk.whyItApplies.en}
                                                                </span>
                                                                {isOpen && risk.actions.length > 0 && (
                                                                    <span className="mt-0.5 block text-caption text-primary dark:text-mint [overflow-wrap:anywhere]">
                                                                        {risk.actions[0].label[lang] ||
                                                                            risk.actions[0].label.en}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-kicker font-bold uppercase tracking-widest text-muted-foreground">
                                            {confidenceLabel(dimension.confidence)}
                                        </p>
                                        {dimension.confidenceLimit && (
                                            <p className="mt-0.5 text-caption leading-relaxed text-black/60 dark:text-white/60">
                                                {dimension.confidenceLimit[lang] || dimension.confidenceLimit.en}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>

            {notApplicable.length > 0 && (
                <p className="mt-4 border-t border-black/8 pt-3 text-caption leading-relaxed text-muted-foreground dark:border-white/10">
                    {t(
                        `Δεν σας αφορούν: ${notApplicable.map((d) => d.label.el).join(", ")}. Δεν βαθμολογούνται επειδή δεν υπάρχει έκθεση προς μέτρηση.`,
                        `Not yours to worry about: ${notApplicable.map((d) => d.label.en).join(", ")}. Unscored because there is no exposure to measure.`,
                    )}
                </p>
            )}
        </div>
    )
}

function Block({
    title,
    body,
    lang,
    fallback,
}: {
    title: string
    body: Bilingual | null
    lang: "en" | "el"
    fallback?: string
}) {
    if (!body && !fallback) return null
    return (
        <div>
            <p className="text-kicker font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-black/75 dark:text-white/75 [overflow-wrap:anywhere]">
                {body ? body[lang] || body.en : fallback}
            </p>
        </div>
    )
}
