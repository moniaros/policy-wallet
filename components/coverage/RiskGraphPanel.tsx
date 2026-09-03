"use client"

/**
 * The Personal Risk Graph, rendered.
 *
 * This panel answers a question the product could not previously ask: **what in
 * your life are we protecting, and how well?** The rows are things — a property,
 * a car, a dependant — not policies, and each carries the evidence behind its
 * verdict rather than asserting it.
 *
 * Two decisions worth stating:
 *
 * - **Not a node-and-edge diagram.** A force-directed graph is unreadable at
 *   320px, encodes nothing a list cannot, and cannot show evidence. Things
 *   grouped by protection state is the same information, legible on a phone.
 * - **`unknown` looks different from `unprotected`.** They are different
 *   statements — "we cannot tell" versus "nothing covers this" — and rendering
 *   them alike is the defect that made an unread sum insured look like adequate
 *   cover.
 * - **A line the customer does not hold is *not held*, never a finding**
 *   (§2.2). «Απροστάτευτο» over a pet line whose owner has simply never bought
 *   pet cover claims exposure for a product they do not own. The split is a
 *   FACT, not a heuristic: `heldInLine` counts wallet policies of any status
 *   in the risk's line, so an expired motor policy — a held product whose
 *   cover lapsed — stays a red finding, while a never-bought line renders in
 *   a neutral register, in words («Χωρίς ασφαλιστήριο»), and is never counted
 *   among the findings. Guard: tests/unit/unowned-lines-not-held.test.tsx.
 */

import { useState } from "react"
import { AlertTriangle, CircleDashed, CircleHelp, ShieldCheck, ShieldAlert } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import type { RiskState } from "@/lib/services/risk-graph/types"
import type { GraphRiskView } from "@/lib/services/risk-graph/present"

interface RiskGraphPanelProps {
    risks: GraphRiskView[]
    summary: { nodeCount: number; assets: number; obligations: number; dependants: number }
    language: "en" | "el"
}

/**
 * What the panel renders is the engine's state REFINED by ownership: an
 * `unprotected` risk with no policy of any status in its line is presented as
 * `not_held`. The refinement lives here, from facts the engine supplies —
 * never re-derived from policy data in render code.
 */
type PanelState = RiskState | "not_held"

const STATE_ORDER: PanelState[] = [
    "unprotected",
    "partially_protected",
    "unknown",
    // After every statement about cover the customer HAS, before "fine":
    // not-held is information, not a problem to rank among problems.
    "not_held",
    "protected",
]

const presentationState = (risk: GraphRiskView): PanelState =>
    risk.state === "unprotected" && risk.heldInLine === 0 ? "not_held" : risk.state

/** State pills on the status tokens — each tint/on-colour pair is measured once in globals.css. */
const STATE_STYLES: Record<PanelState, { chip: string; icon: typeof ShieldCheck }> = {
    unprotected: {
        chip: "bg-status-danger-tint text-status-danger",
        icon: AlertTriangle,
    },
    partially_protected: {
        chip: "bg-status-warning-tint text-status-warning",
        icon: ShieldAlert,
    },
    unknown: {
        // Visually distinct from unprotected on purpose — "we cannot tell" and
        // "nothing covers this" are different statements.
        chip: "bg-status-info-tint text-status-info",
        icon: CircleHelp,
    },
    protected: {
        chip: "bg-status-success-tint text-status-success",
        icon: ShieldCheck,
    },
    not_held: {
        // Neutral on purpose (§2.2): not owning a product is not a gap, so
        // nothing here may read as a finding — no red, no alarm icon. The
        // label carries the distinction in words, never colour alone.
        chip: "bg-muted text-foreground",
        icon: CircleDashed,
    },
}

export function RiskGraphPanel({ risks, summary, language }: RiskGraphPanelProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const [filter, setFilter] = useState<PanelState | "all">("all")

    if (risks.length === 0) return null

    const stateLabel = (state: PanelState): string => {
        switch (state) {
            case "protected":
                return t("Προστατευμένο", "Protected")
            case "partially_protected":
                return t("Μερικώς προστατευμένο", "Partially protected")
            case "unprotected":
                return t("Απροστάτευτο", "Unprotected")
            case "unknown":
                return t("Άγνωστο", "Unknown")
            case "not_held":
                // A statement of fact in a neutral register, not a verdict:
                // the customer holds no policy in this line.
                return t("Χωρίς ασφαλιστήριο", "Not held")
        }
    }

    const counts = STATE_ORDER.map((state) => ({
        state,
        count: risks.filter((r) => presentationState(r) === state).length,
    })).filter((entry) => entry.count > 0)

    // Greek inflects for number, so "1 περιουσιακά στοιχεία" is simply wrong in
    // the product's default language. Zero-count clauses are dropped rather than
    // rendered: "0 obligations" is noise a renter does not need read back.
    const n = (count: number, elOne: string, elMany: string, enOne: string, enMany: string) =>
        `${count} ${lang === "el" ? (count === 1 ? elOne : elMany) : count === 1 ? enOne : enMany}`

    // Each clause keeps its registered count key — the SAME keys the household
    // card on this page renders, because both derive from one graph. The
    // attributes are what turn an eventual drift between the two into a
    // measured count-consistency failure instead of an argument (§6.7).
    const parts = [
        summary.assets > 0 && {
            key: "household.assetCount",
            label: n(summary.assets, "περιουσιακό στοιχείο", "περιουσιακά στοιχεία", "asset", "assets"),
        },
        summary.obligations > 0 && {
            key: "household.obligationCount",
            label: n(summary.obligations, "υποχρέωση", "υποχρεώσεις", "obligation", "obligations"),
        },
        summary.dependants > 0 && {
            key: "household.dependantCount",
            label: n(summary.dependants, "εξαρτώμενο μέλος", "εξαρτώμενα μέλη", "dependant", "dependants"),
        },
    ].filter((part): part is { key: string; label: string } => typeof part === "object" && part !== null)

    const headline = n(summary.nodeCount, "πράγμα", "πράγματα", "thing", "things")

    // Every graph contains a person and a household, so a customer who has told
    // us nothing still counts two — and "we are tracking 2 things in your life"
    // implies we know two things about them when we know none. Count only when
    // something they actually told us is in there.
    const knowsSomething = parts.length > 0

    const visible = filter === "all" ? risks : risks.filter((r) => presentationState(r) === filter)
    const ordered = [...visible].sort(
        (a, b) => STATE_ORDER.indexOf(presentationState(a)) - STATE_ORDER.indexOf(presentationState(b))
    )

    return (
        <div className="pw-card pw-pad">
            <div className="mb-4">
                <CardHead icon={ShieldCheck} title={t("Τι προστατεύουμε", "What we are protecting")} />
                <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
                    {knowsSomething ? (
                        // Composed as spans so each count carries its key — a
                        // sentence with four quantities in one string is four
                        // numbers the count-consistency scan cannot attribute.
                        <>
                            {t("Παρακολουθούμε ", "We are tracking ")}
                            <span data-count="riskGraph.nodeCount">{headline}</span>
                            {t(" στη ζωή σας — ", " in your life — ")}
                            {parts.map((part, i) => (
                                <span key={part.key}>
                                    {i > 0 && ", "}
                                    <span data-count={part.key}>{part.label}</span>
                                </span>
                            ))}
                            .
                        </>
                    ) : (
                        t(
                            "Δεν μας έχετε πει ακόμη τι υπάρχει στη ζωή σας. Όσα ακολουθούν είναι όσα ισχύουν για τον καθένα.",
                            "You have not yet told us what is in your life. What follows is what applies to anyone."
                        )
                    )}
                </p>
            </div>

            {/* A segmented control on the sunken track, and a scroll strip
                rather than a wrapping row: five chips wrap to three lines at
                320px and push the content below the fold. */}
            <div
                className="pw-segmented pw-scroll-strip mb-4"
                role="group"
                aria-label={t("Φίλτρο προστασίας", "Filter by protection")}
            >
                <Chip active={filter === "all"} onClick={() => setFilter("all")} label={t("Όλα", "All")} count={risks.length} countKey="riskGraph.riskCount" />
                {counts.map(({ state, count }) => (
                    <Chip
                        key={state}
                        active={filter === state}
                        onClick={() => setFilter(state)}
                        label={stateLabel(state)}
                        count={count}
                        countKey="riskGraph.stateCount"
                        countSubject={state}
                    />
                ))}
            </div>

            <ul className="space-y-2">
                {ordered.map((risk) => {
                    const rowState = presentationState(risk)
                    const styles = STATE_STYLES[rowState]
                    const StateIcon = styles.icon
                    const BranchIcon = getBranchIcon(risk.lineOfBusiness)

                    return (
                        <li key={risk.riskId}>
                            <details className="group pw-subcard p-3.5 sm:p-4">
                                <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                                    <span className="mt-0.5 flex-shrink-0 text-muted-foreground">
                                        <BranchIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                                            {risk.name[lang] || risk.name.en}
                                        </span>

                                        {/* The THINGS this risk attaches to — the graph's
                                            whole contribution. A flat model could only say
                                            "property"; this says which.

                                            `overflow-wrap:anywhere` because some labels are
                                            the customer's own free text (occupation, chronic
                                            condition): one long unbroken word would otherwise
                                            scroll the whole page sideways at 320px. */}
                                        {risk.anchors.length > 0 && (
                                            <span className="mt-0.5 block text-caption text-muted-foreground [overflow-wrap:anywhere]">
                                                {risk.anchors.map((a) => a[lang] || a.en).join(" · ")}
                                            </span>
                                        )}

                                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold ${styles.chip}`}
                                            >
                                                <StateIcon className="h-3 w-3" aria-hidden="true" />
                                                {stateLabel(rowState)}
                                            </span>
                                        </span>
                                    </span>

                                    <span
                                        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-muted-foreground transition-transform group-open:rotate-180"
                                        aria-hidden="true"
                                    >
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                                            <path
                                                d="M1 1.5L6 6.5L11 1.5"
                                                stroke="currentColor"
                                                strokeWidth="1.75"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </span>
                                </summary>

                                {/* Two lists, one source.

                                    The evidence array already carries every failed and
                                    unevaluable dimension — rendering the dimensions
                                    separately as well printed each of those sentences
                                    twice, one under the other. So the split is by what
                                    the item DOES: facts and policies establish the
                                    picture; derived findings are what stops it being
                                    `protected`. */}
                                <div className="mt-3 space-y-3 border-t border-border pt-3">
                                    <EvidenceList
                                        title={t("Σε τι βασιζόμαστε", "What this rests on")}
                                        items={risk.evidence.filter((e) =>
                                            ["declared_fact", "held_policy", "absence"].includes(e.kind)
                                        )}
                                        lang={lang}
                                    />
                                    <EvidenceList
                                        title={t("Τι δεν επιβεβαιώνεται", "What is not confirmed")}
                                        items={risk.evidence.filter((e) =>
                                            ["derived", "market_rule"].includes(e.kind)
                                        )}
                                        lang={lang}
                                    />
                                </div>
                            </details>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

function EvidenceList({
    title,
    items,
    lang,
}: {
    title: string
    items: GraphRiskView["evidence"]
    lang: "en" | "el"
}) {
    if (items.length === 0) return null
    return (
        <div>
            <p className="mb-1.5 text-caption font-semibold text-muted-foreground">
                {title}
            </p>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li
                        key={`${item.kind}-${i}`}
                        className="flex items-start gap-2 text-caption leading-relaxed text-foreground/80"
                    >
                        <span
                            className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                            {item.statement[lang] || item.statement.en}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function Chip({
    active,
    onClick,
    label,
    count,
    countKey,
    countSubject,
}: {
    active: boolean
    onClick: () => void
    label: string
    count: number
    /** Registered data-count key; state chips are subject-scoped by state. */
    countKey?: string
    countSubject?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className="pw-segment min-h-11 px-4"
        >
            {label}
            {/* Inherits the segment's colour: a muted count inside the phone
                layer's ink pill would sit at 3:1 on black. */}
            <span
                className="tabular-nums font-medium"
                data-count={countKey}
                data-count-subject={countSubject}
            >
                {count}
            </span>
        </button>
    )
}
