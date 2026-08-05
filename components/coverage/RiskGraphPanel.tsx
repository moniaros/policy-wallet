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
 */

import { useState } from "react"
import { AlertTriangle, CircleHelp, ShieldCheck, ShieldAlert } from "lucide-react"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import type { RiskState } from "@/lib/services/risk-graph/types"
import type { GraphRiskView } from "@/lib/services/risk-graph/present"

interface RiskGraphPanelProps {
    risks: GraphRiskView[]
    summary: { nodeCount: number; assets: number; obligations: number; dependants: number }
    language: "en" | "el"
}

const STATE_ORDER: RiskState[] = ["unprotected", "partially_protected", "unknown", "protected"]

const STATE_STYLES: Record<RiskState, { chip: string; icon: typeof ShieldCheck }> = {
    unprotected: {
        chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300",
        icon: AlertTriangle,
    },
    partially_protected: {
        chip: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300",
        icon: ShieldAlert,
    },
    unknown: {
        // Visually distinct from unprotected on purpose — "we cannot tell" and
        // "nothing covers this" are different statements.
        chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300",
        icon: CircleHelp,
    },
    protected: {
        chip: "border-primary/25 bg-primary/8 text-primary dark:border-primary/30 dark:bg-primary/12 dark:text-mint",
        icon: ShieldCheck,
    },
}

export function RiskGraphPanel({ risks, summary, language }: RiskGraphPanelProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const [filter, setFilter] = useState<RiskState | "all">("all")

    if (risks.length === 0) return null

    const stateLabel = (state: RiskState): string => {
        switch (state) {
            case "protected":
                return t("Προστατευμένο", "Protected")
            case "partially_protected":
                return t("Μερικώς προστατευμένο", "Partially protected")
            case "unprotected":
                return t("Απροστάτευτο", "Unprotected")
            case "unknown":
                return t("Άγνωστο", "Unknown")
        }
    }

    const counts = STATE_ORDER.map((state) => ({
        state,
        count: risks.filter((r) => r.state === state).length,
    })).filter((entry) => entry.count > 0)

    // Greek inflects for number, so "1 περιουσιακά στοιχεία" is simply wrong in
    // the product's default language. Zero-count clauses are dropped rather than
    // rendered: "0 obligations" is noise a renter does not need read back.
    const n = (count: number, elOne: string, elMany: string, enOne: string, enMany: string) =>
        `${count} ${lang === "el" ? (count === 1 ? elOne : elMany) : count === 1 ? enOne : enMany}`

    const parts = [
        summary.assets > 0 &&
            n(summary.assets, "περιουσιακό στοιχείο", "περιουσιακά στοιχεία", "asset", "assets"),
        summary.obligations > 0 &&
            n(summary.obligations, "υποχρέωση", "υποχρεώσεις", "obligation", "obligations"),
        summary.dependants > 0 &&
            n(summary.dependants, "εξαρτώμενο μέλος", "εξαρτώμενα μέλη", "dependant", "dependants"),
    ].filter((part): part is string => typeof part === "string")

    const headline = n(summary.nodeCount, "πράγμα", "πράγματα", "thing", "things")

    // Every graph contains a person and a household, so a customer who has told
    // us nothing still counts two — and "we are tracking 2 things in your life"
    // implies we know two things about them when we know none. Count only when
    // something they actually told us is in there.
    const knowsSomething = parts.length > 0

    const visible = filter === "all" ? risks : risks.filter((r) => r.state === filter)
    const ordered = [...visible].sort(
        (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
    )

    return (
        <div className="pw-card pw-pad">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                    {t("Τι προστατεύουμε", "What we are protecting")}
                </h2>
                <p className="text-caption text-muted-foreground">
                    {knowsSomething
                        ? t(
                              `Παρακολουθούμε ${headline} στη ζωή σας — ${parts.join(", ")}.`,
                              `We are tracking ${headline} in your life — ${parts.join(", ")}.`
                          )
                        : t(
                              "Δεν μας έχετε πει ακόμη τι υπάρχει στη ζωή σας. Όσα ακολουθούν είναι όσα ισχύουν για τον καθένα.",
                              "You have not yet told us what is in your life. What follows is what applies to anyone."
                          )}
                </p>
            </div>

            {/* Scrollable strip rather than a wrapping row: five chips wrap to
                three lines at 320px and push the content below the fold. */}
            <div
                className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
                role="group"
                aria-label={t("Φίλτρο προστασίας", "Filter by protection")}
            >
                <Chip active={filter === "all"} onClick={() => setFilter("all")} label={t("Όλα", "All")} count={risks.length} />
                {counts.map(({ state, count }) => (
                    <Chip
                        key={state}
                        active={filter === state}
                        onClick={() => setFilter(state)}
                        label={stateLabel(state)}
                        count={count}
                    />
                ))}
            </div>

            <ul className="space-y-2.5">
                {ordered.map((risk) => {
                    const styles = STATE_STYLES[risk.state]
                    const StateIcon = styles.icon
                    const BranchIcon = getBranchIcon(risk.lineOfBusiness)

                    return (
                        <li key={risk.riskId}>
                            <details className="group rounded-2xl border border-black/10 bg-white p-3.5 dark:border-white/12 dark:bg-white/[0.03] sm:p-4">
                                <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                                    <span className="mt-0.5 flex-shrink-0 text-black/60 dark:text-white/60">
                                        <BranchIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
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
                                            <span className="mt-0.5 block text-caption text-black/60 dark:text-white/55 [overflow-wrap:anywhere]">
                                                {risk.anchors.map((a) => a[lang] || a.en).join(" · ")}
                                            </span>
                                        )}

                                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-kicker font-semibold uppercase tracking-wider ${styles.chip}`}
                                            >
                                                <StateIcon className="h-2.5 w-2.5" aria-hidden="true" />
                                                {stateLabel(risk.state)}
                                            </span>
                                        </span>
                                    </span>

                                    <span
                                        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-black/35 transition-transform group-open:rotate-180 dark:text-white/35"
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
                                <div className="mt-3 space-y-3 border-t border-black/8 pt-3 dark:border-white/10">
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
            <p className="mb-1.5 text-kicker font-bold uppercase tracking-widest text-black/60 dark:text-white/55">
                {title}
            </p>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li
                        key={`${item.kind}-${i}`}
                        className="flex items-start gap-2 text-caption leading-relaxed text-black/70 dark:text-white/70"
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
    )
}

function Chip({
    active,
    onClick,
    label,
    count,
}: {
    active: boolean
    onClick: () => void
    label: string
    count: number
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex min-h-11 flex-shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-caption font-semibold transition-colors ${
                active
                    ? "border-primary bg-primary text-white dark:text-[#1A2420]"
                    : "border-black/12 text-black/65 hover:bg-black/4 dark:border-white/15 dark:text-white/65 dark:hover:bg-white/6"
            }`}
        >
            {label}
            <span className={active ? "opacity-80" : "text-muted-foreground"}>{count}</span>
        </button>
    )
}
