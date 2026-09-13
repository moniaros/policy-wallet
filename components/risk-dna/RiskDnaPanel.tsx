"use client"

/**
 * Risk DNA — the signature.
 *
 * **Not a radar chart, and — since PW-TRANSPARENCY-02 F2 (B1.6) — not a
 * scoreboard either.** Nine "dimensions of your life", each a lens that opens
 * to the risks it concerns and what would be done about them. The 0–100
 * reading, the threshold-coloured bar, the trend arrow, the "improved by N"
 * sentence and the "what acting would do to the score" line are gone: a
 * dimension number was a judgment the engine could not substantiate, and a
 * threshold colour was a verdict nobody had confirmed (DECISIONS.md D-F2).
 * Where the number sat, each dimension now carries the disclosed-findings
 * treatment built in B3 — the under-review label, with the disclosure under
 * the heading — until a human classifies the requirements behind it.
 *
 * A dimension that does not apply is listed separately rather than rendered
 * as a row. A childless renter has no Family exposure, and rendering that as
 * "nothing open here" would report the absence of an exposure as a result.
 */

import { useState } from "react"
import { ChevronDown, Dna } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { getTranslations } from "@/lib/i18n"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

type Trend = "improving" | "worsening" | "steady" | "unknown"
type Urgency = "now" | "soon" | "watch" | "none"

export interface DimensionView {
    id: string
    label: Bilingual
    question: Bilingual
    /** Computed, never rendered (F2). Null means the dimension does not apply. */
    score: number | null
    coarse: boolean
    confidence: "high" | "medium" | "low"
    confidenceLimit: Bilingual | null
    /** Computed from the score history, never rendered (F2). */
    trend: Trend
    trendDelta: number | null
    urgency: Urgency
    /** A sentence quoting a score delta — never rendered (F2). */
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual | null
    /** A points estimate — never rendered (F2). */
    ifActioned: { points: number } | null
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

export function RiskDnaPanel({ dimensions, language }: RiskDnaPanelProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const provenance = getTranslations(lang).provenance
    const [openId, setOpenId] = useState<string | null>(null)

    // A dimension that does not apply is not a weakness — it is the absence of
    // an exposure, and it is listed separately rather than assessed.
    const applicable = dimensions.filter((d) => d.score !== null)
    const notApplicable = dimensions.filter((d) => d.score === null)

    if (applicable.length === 0) return null

    const confidenceLabel = (c: DimensionView["confidence"]) =>
        c === "high"
            ? t("Υψηλή βεβαιότητα", "High confidence")
            : c === "medium"
              ? t("Μεσαία βεβαιότητα", "Medium confidence")
              : t("Χαμηλή βεβαιότητα", "Low confidence")

    return (
        <div className="pw-card pw-pad">
            <div className="mb-4">
                <CardHead icon={Dna} title={t("Το προφίλ κινδύνου σας", "Your risk profile")} />
                <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
                    {t(
                        "Εννέα διαστάσεις της ζωής σας. Δεν αθροίζονται σε έναν βαθμό — είναι φακοί, όχι βαθμολόγιο.",
                        "Nine dimensions of your life. They do not add up to one number — they are lenses, not a scoreboard.",
                    )}
                </p>
                {/* B3 disclosed-findings treatment (F2): what a dimension rests on has
                    not been classified as legal, contractual or market practice, and
                    the panel says so where the numbers used to be. */}
                <p data-fact="riskDimension.disclosure" className="mt-1 text-caption leading-relaxed text-muted-foreground">
                    {provenance.underReviewDisclosure}
                </p>
            </div>

            <ul className="space-y-1">
                {applicable.map((dimension) => {
                    const isOpen = openId === dimension.id

                    return (
                        <li key={dimension.id}>
                            <button
                                type="button"
                                onClick={() => setOpenId(isOpen ? null : dimension.id)}
                                aria-expanded={isOpen}
                                className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-muted/60"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-semibold text-foreground">
                                            {dimension.label[lang] || dimension.label.en}
                                        </span>
                                        {/* Text, never a number, never a colour of its own (B3). */}
                                        <span
                                            className="flex-shrink-0 rounded-full border border-border px-2 py-0.5 text-caption text-muted-foreground"
                                            data-fact="riskDimension.provenance"
                                            data-fact-subject={dimension.id}
                                            data-provenance="under_review"
                                        >
                                            {provenance.underReview}
                                        </span>
                                    </span>
                                </span>

                                <ChevronDown
                                    className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                                    aria-hidden="true"
                                />
                            </button>

                            {isOpen && (
                                <div className="pw-subcard mt-1 space-y-3 px-3 py-3">
                                    <p className="text-caption italic leading-relaxed text-muted-foreground">
                                        {dimension.question[lang] || dimension.question.en}
                                    </p>

                                    <Block
                                        title={t("Γιατί έχει σημασία", "Why it matters")}
                                        body={dimension.whyItMatters}
                                        lang={lang}
                                    />
                                    <Block
                                        title={t("Τι ακολουθεί", "What happens next")}
                                        body={dimension.nextAction}
                                        lang={lang}
                                        fallback={t("Τίποτα ανοιχτό εδώ.", "Nothing open here.")}
                                    />

                                    {/* The risks themselves, inside the dimension
                                        they concern. This replaces a separate flat
                                        list of all 21 — two renderings of one
                                        assessment that a customer had to reconcile
                                        for themselves. */}
                                    {dimension.risks.length > 0 && (
                                        <div>
                                            <p className="text-caption font-semibold text-muted-foreground">
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
                                                                        ? "bg-status-warning"
                                                                        : "bg-status-success"
                                                                }`}
                                                                aria-hidden="true"
                                                            />
                                                            <span className="min-w-0">
                                                                <span className="block text-caption font-semibold text-foreground [overflow-wrap:anywhere]">
                                                                    {risk.name[lang] || risk.name.en}
                                                                </span>
                                                                <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
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
                                        <p className="text-caption font-semibold text-muted-foreground">
                                            {confidenceLabel(dimension.confidence)}
                                        </p>
                                        {dimension.confidenceLimit && (
                                            <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
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
                <p className="mt-4 border-t border-border pt-3 text-caption leading-relaxed text-muted-foreground">
                    {t(
                        `Δεν σας αφορούν: ${notApplicable.map((d) => d.label.el).join(", ")}. Δεν εξετάζονται επειδή δεν υπάρχει έκθεση προς αξιολόγηση.`,
                        `Not yours to worry about: ${notApplicable.map((d) => d.label.en).join(", ")}. Not assessed because there is no exposure to assess.`,
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
            <p className="text-caption font-semibold text-muted-foreground">{title}</p>
            <p className="mt-0.5 text-caption leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                {body ? body[lang] || body.en : fallback}
            </p>
        </div>
    )
}
