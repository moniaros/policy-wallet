"use client"

import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The shared KPI/stat tile.
 *
 * There were two near-identical `KpiCard`s — one in the wallet, one on the agent
 * dashboard — plus a third stat block on the home page. Same anatomy every time
 * (accent chip, label, big number, optional sub-line) but different icon sizes,
 * value sizes, font weights and accent maps, so the two halves of the product
 * quietly disagreed about what a metric looks like.
 *
 * Direction A (2026-09-03): the tile is the card anatomy's fact cell — a 36px
 * chip, a sentence-case caption, a tabular number in the text colour. The
 * accent tints the chip's GLYPH only: a number painted red is a verdict, and
 * «1 πελάτης με κενά» is a count. Sentence case in the string, never CSS
 * uppercase — Greek capitals drop their accents.
 *
 * Density is responsive: the tile is compact on a phone and opens up from `sm`,
 * because these appear four-across on desktop and two-across at 375px.
 */

export type StatAccent = "brand" | "positive" | "warning" | "critical" | "neutral"

const CHIP: Record<StatAccent, string> = {
    brand: "text-primary",
    positive: "text-status-success",
    warning: "text-status-warning",
    critical: "text-status-danger",
    neutral: "",
}

interface StatTileProps {
    label: string
    value: ReactNode
    /** Secondary line. Wraps rather than truncating — a clipped metric is worse than a taller tile. */
    hint?: ReactNode
    icon?: ElementType
    accent?: StatAccent
    /** Replaces the icon chip entirely (e.g. a progress ring). */
    visual?: ReactNode
    className?: string
}

export function StatTile({
    label,
    value,
    hint,
    icon: Icon,
    accent = "neutral",
    visual,
    className,
}: StatTileProps) {
    return (
        <div className={cn("pw-card flex items-center gap-3 pw-pad-tight", className)}>
            {visual ?? (Icon && (
                <span className={cn("pw-card-chip", CHIP[accent])} aria-hidden="true">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
            ))}
            <div className="min-w-0">
                <p className="text-caption font-medium leading-tight text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-title font-semibold tabular-nums leading-none tracking-tight text-foreground">
                    {value}
                </p>
                {hint && <p className="mt-1 text-caption text-muted-foreground">{hint}</p>}
            </div>
        </div>
    )
}

/**
 * Standard responsive grid for a row of tiles. Two-up on a phone, and four-up
 * only from `xl` — at `lg` the app shell's sidebar leaves too little room and
 * four columns truncate their hints.
 */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
    // Single column below 360px. Two columns at 320 leave each tile ~138px, of
    // which the icon and gaps take half — not enough for a long Greek label,
    // which is why every one of them broke mid-word.
    return (
        <div className={cn("grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 xl:grid-cols-4", className)}>
            {children}
        </div>
    )
}
