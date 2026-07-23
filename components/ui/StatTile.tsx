"use client"

import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The shared KPI/stat tile.
 *
 * There were two near-identical `KpiCard`s — one in the wallet, one on the agent
 * dashboard — plus a third stat block on the home page. Same anatomy every time
 * (accent chip, kicker label, big number, optional sub-line) but different icon
 * sizes (11 vs 9), value sizes (2xl vs xl), font weights (semibold vs black) and
 * accent maps, so the two halves of the product quietly disagreed about what a
 * metric looks like.
 *
 * Density is responsive: the tile is compact on a phone and opens up from `sm`,
 * because these appear four-across on desktop and two-across at 375px.
 */

export type StatAccent = "brand" | "positive" | "warning" | "critical" | "neutral"

const CHIP: Record<StatAccent, string> = {
    brand: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    positive: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    warning: "bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300",
    critical: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300",
    neutral: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70",
}

const VALUE: Record<StatAccent, string> = {
    brand: "text-foreground",
    positive: "text-primary dark:text-mint",
    warning: "text-[#B45309] dark:text-amber-300",
    critical: "text-[#B91C1C] dark:text-red-300",
    neutral: "text-foreground",
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
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11", CHIP[accent])}>
                    <Icon className="h-5 w-5" />
                </span>
            ))}
            <div className="min-w-0">
                <p className="pw-kicker leading-tight">{label}</p>
                <p className={cn("mt-0.5 text-title font-semibold tabular-nums leading-none tracking-tight sm:text-h3", VALUE[accent])}>
                    {value}
                </p>
                {hint && <p className="mt-1 text-micro text-muted-foreground">{hint}</p>}
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
    return (
        <div className={cn("grid grid-cols-2 gap-3 xl:grid-cols-4", className)}>
            {children}
        </div>
    )
}
