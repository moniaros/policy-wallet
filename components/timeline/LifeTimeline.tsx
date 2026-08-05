"use client"

/**
 * The Personal Life Timeline, rendered.
 *
 * The design problem is that a timeline is a vertical rail, and a vertical rail
 * costs horizontal space the 320px viewport does not have. So the rail is thin
 * (a 1px line with an 8px marker) and the content column takes everything else;
 * nothing is laid out in two columns at any width, because an alternating
 * left/right timeline — the conventional desktop treatment — halves the usable
 * width for Greek text that is already ~30% longer than English.
 *
 * The causal link is the whole point of the surface. "Why this?" is a real
 * control, not decoration: it scrolls to the entry that caused this one and
 * flashes it, so the customer can check the claim rather than take it.
 */

import { useCallback, useMemo, useRef, useState } from "react"
import {
    ArrowUpRight,
    CalendarDays,
    CircleHelp,
    FileText,
    Handshake,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from "lucide-react"
import { formatDate } from "@/lib/i18n/format"
import type { TimelineKind } from "@/lib/services/timeline/types"

interface Bilingual {
    en: string
    el: string
}

export interface TimelineEntryView {
    id: string
    kind: TimelineKind
    at: string
    title: Bilingual
    detail: Bilingual | null
    cause: { entryId: string; explanation: Bilingual } | null
    delta?: number | null
    riskId?: string | null
    href?: string | null
}

interface LifeTimelineProps {
    entries: TimelineEntryView[]
    language: "en" | "el"
}

const KIND_ICON: Record<TimelineKind, typeof CalendarDays> = {
    life_event: CalendarDays,
    policy_added: FileText,
    coverage_change: ShieldAlert,
    renewal: RefreshCw,
    risk_change: ShieldAlert,
    score_change: TrendingUp,
    recommendation: Sparkles,
    advisor_action: Handshake,
}

/**
 * One accent per kind.
 *
 * Score changes deliberately take their colour from DIRECTION rather than kind —
 * a fall and a rise are the two things a reader scans this surface for, and
 * painting both the same neutral makes the page useless at a glance.
 */
const KIND_ACCENT: Record<TimelineKind, string> = {
    life_event: "text-primary dark:text-mint",
    policy_added: "text-blue-600 dark:text-blue-400",
    coverage_change: "text-amber-600 dark:text-amber-400",
    renewal: "text-blue-600 dark:text-blue-400",
    risk_change: "text-amber-600 dark:text-amber-400",
    score_change: "text-black/60 dark:text-white/60",
    recommendation: "text-primary dark:text-mint",
    advisor_action: "text-purple-600 dark:text-purple-400",
}

export function LifeTimeline({ entries, language }: LifeTimelineProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const [filter, setFilter] = useState<TimelineKind | "all">("all")
    const [flashed, setFlashed] = useState<string | null>(null)
    const refs = useRef(new Map<string, HTMLLIElement | null>())

    // A plain function, not a useCallback: it closes over `lang` and is called
    // once per row, so memoising it buys nothing and only invites the stale
    // dependency the linter was objecting to.
    const kindLabel = (kind: TimelineKind): string => {
            switch (kind) {
                case "life_event":
                    return t("Μεταβολές ζωής", "Life changes")
                case "policy_added":
                    return t("Ασφαλιστήρια", "Policies")
                case "coverage_change":
                    return t("Κάλυψη", "Cover")
                case "renewal":
                    return t("Ανανεώσεις", "Renewals")
                case "risk_change":
                    return t("Κίνδυνοι", "Risks")
                case "score_change":
                    return t("Σκορ", "Score")
                case "recommendation":
                    return t("Προτάσεις", "Recommendations")
                case "advisor_action":
                    return t("Σύμβουλος", "Advisor")
            }
    }

    const counts = useMemo(() => {
        const map = new Map<TimelineKind, number>()
        for (const entry of entries) map.set(entry.kind, (map.get(entry.kind) ?? 0) + 1)
        return map
    }, [entries])

    const visible = useMemo(
        () => (filter === "all" ? entries : entries.filter((e) => e.kind === filter)),
        [entries, filter]
    )

    /**
     * Jump to the cause and flash it.
     *
     * Clearing the filter first: the cause is very often a kind the reader has
     * filtered out — that is exactly why they could not see the connection — and
     * scrolling to an element that is not in the DOM does nothing at all, which
     * reads as a broken button.
     */
    const showCause = useCallback((entryId: string) => {
        setFilter("all")
        requestAnimationFrame(() => {
            const node = refs.current.get(entryId)
            node?.scrollIntoView({ behavior: "smooth", block: "center" })
            setFlashed(entryId)
            window.setTimeout(() => setFlashed((current) => (current === entryId ? null : current)), 2200)
        })
    }, [])

    if (entries.length === 0) {
        return (
            <div className="pw-card pw-pad">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                    {t("Το χρονολόγιό σας", "Your timeline")}
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                    {t(
                        "Μόλις προσθέσετε ένα ασφαλιστήριο ή δηλώσετε μια μεταβολή, εδώ θα εξηγείται τι άλλαξε και γιατί.",
                        "Once you add a policy or record a change, this is where we explain what moved and why.",
                    )}
                </p>
            </div>
        )
    }

    const byKind = [...counts.entries()].sort((a, b) => b[1] - a[1])

    return (
        <div className="pw-card pw-pad">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                    {t("Το χρονολόγιό σας", "Your timeline")}
                </h2>
                <p className="text-caption text-muted-foreground">
                    {t(
                        "Τι άλλαξε στη ζωή σας, τι κάναμε γι' αυτό, και γιατί.",
                        "What changed in your life, what we did about it, and why.",
                    )}
                </p>
            </div>

            {/* Scrollable strip: eight kind chips wrap to four lines at 320px. */}
            {byKind.length > 1 && (
                <div
                    className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
                    role="group"
                    aria-label={t("Φίλτρο χρονολογίου", "Filter the timeline")}
                >
                    <Chip
                        active={filter === "all"}
                        onClick={() => setFilter("all")}
                        label={t("Όλα", "All")}
                        count={entries.length}
                    />
                    {byKind.map(([kind, count]) => (
                        <Chip
                            key={kind}
                            active={filter === kind}
                            onClick={() => setFilter(kind)}
                            label={kindLabel(kind)}
                            count={count}
                        />
                    ))}
                </div>
            )}

            <ol className="relative space-y-0">
                {/* The rail. Decorative — the <ol> already conveys sequence to a
                    screen reader, and a described line would just be noise. */}
                <span
                    className="pointer-events-none absolute left-[11px] top-2 bottom-2 w-px bg-black/10 dark:bg-white/12"
                    aria-hidden="true"
                />

                {visible.map((entry) => {
                    const Icon =
                        entry.kind === "score_change" && typeof entry.delta === "number" && entry.delta < 0
                            ? TrendingDown
                            : KIND_ICON[entry.kind]
                    const accent =
                        entry.kind === "score_change" && typeof entry.delta === "number" && entry.delta !== 0
                            ? entry.delta > 0
                                ? "text-primary dark:text-mint"
                                : "text-red-600 dark:text-red-400"
                            : KIND_ACCENT[entry.kind]

                    return (
                        <li
                            key={entry.id}
                            ref={(node) => {
                                refs.current.set(entry.id, node)
                            }}
                            className={`relative rounded-xl pl-9 transition-colors duration-500 ${
                                flashed === entry.id ? "bg-primary/8 dark:bg-primary/12" : ""
                            }`}
                        >
                            <span
                                className={`absolute left-0 top-3 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-black/10 bg-white dark:border-white/15 dark:bg-[#141A18] ${accent}`}
                                aria-hidden="true"
                            >
                                <Icon className="h-3 w-3" />
                            </span>

                            <div className="py-3">
                                <p className="text-kicker uppercase tracking-wider text-muted-foreground">
                                    <time dateTime={entry.at}>{formatDate(entry.at, lang)}</time>
                                    <span className="mx-1.5" aria-hidden="true">
                                        ·
                                    </span>
                                    {kindLabel(entry.kind)}
                                </p>

                                <p className="mt-0.5 text-sm font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                    {entry.title[lang] || entry.title.en}
                                    {entry.kind === "score_change" && typeof entry.delta === "number" && entry.delta !== 0 && (
                                        <span className={`ml-1.5 font-bold ${accent}`}>
                                            {entry.delta > 0 ? "+" : ""}
                                            {entry.delta}
                                        </span>
                                    )}
                                </p>

                                {entry.detail && (
                                    <p className="mt-1 text-caption leading-relaxed text-black/70 dark:text-white/70 [overflow-wrap:anywhere]">
                                        {entry.detail[lang] || entry.detail.en}
                                    </p>
                                )}

                                {(entry.cause || entry.href) && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {entry.cause && (
                                            <button
                                                type="button"
                                                onClick={() => showCause(entry.cause!.entryId)}
                                                className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                                            >
                                                <CircleHelp className="h-3 w-3" aria-hidden="true" />
                                                {t("Γιατί;", "Why this?")}
                                            </button>
                                        )}
                                        {entry.href && (
                                            <a
                                                href={entry.href}
                                                className="inline-flex min-h-11 items-center gap-1 text-caption text-muted-foreground hover:underline"
                                            >
                                                {t("Άνοιγμα", "Open")}
                                                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                {entry.cause && (
                                    <p className="mt-1 text-caption italic leading-relaxed text-black/55 dark:text-white/50 [overflow-wrap:anywhere]">
                                        {entry.cause.explanation[lang] || entry.cause.explanation.en}
                                    </p>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ol>
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
