"use client"

import { ArrowRight, FileSearch } from "lucide-react"

export interface PolicyBriefRowView {
    /** Anchor target on this page, without the '#'. Null renders a plain row —
        some answers ("not checked for this branch") have no detail to open. */
    anchor: string | null
    label: string
    /** The one-line honest statement — counts, hedges and scope notes included. */
    value: string
    tone: "positive" | "warning" | "critical" | "neutral"
}

const TONE_DOTS: Record<PolicyBriefRowView["tone"], string> = {
    positive: "bg-primary dark:bg-mint",
    warning: "bg-amber-500",
    critical: "bg-rose-500",
    neutral: "bg-black/25 dark:bg-white/30",
}

/**
 * The AI Policy Brief — the policy read as seven questions, each answered in
 * one honest line, each anchoring down to the card that carries the detail.
 *
 * The rows are precomputed by the view: every hedge ("as stated in the
 * document", "we only check the same vehicle or address insured twice") is part
 * of the value string, so this component cannot render a count without its
 * evidence boundary. Tone never carries meaning alone — the words do.
 */
export function PolicyBriefCard({
    rows,
    copy,
}: {
    rows: PolicyBriefRowView[]
    copy: {
        title: string
        subtitle: string
    }
}) {
    return (
        <div>
            <h2 className="flex items-center gap-2 text-body font-semibold text-foreground">
                <FileSearch className="h-4 w-4 text-primary dark:text-mint" />
                {copy.title}
            </h2>
            <p className="mt-1 text-caption leading-snug text-muted-foreground">{copy.subtitle}</p>
            <ul className="mt-4 divide-y divide-black/5 dark:divide-white/10">
                {rows.map((row) => {
                    const content = (
                        <>
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${TONE_DOTS[row.tone]}`} aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-black dark:text-white">
                                    {row.label}
                                </span>
                                <span className="mt-0.5 block text-caption leading-snug text-black/65 dark:text-white/60 [overflow-wrap:anywhere]">
                                    {row.value}
                                </span>
                            </span>
                            {row.anchor && (
                                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
                            )}
                        </>
                    )
                    const rowClass = "flex min-h-11 items-center gap-3 py-2.5"
                    return (
                        <li key={row.label}>
                            {row.anchor ? (
                                <a
                                    href={`#${row.anchor}`}
                                    className={`${rowClass} transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]`}
                                >
                                    {content}
                                </a>
                            ) : (
                                <div className={rowClass}>{content}</div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
