"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { StatusChip } from "../primitives"
import type { ProtectionState } from "@/lib/app/state"

export interface VerdictTile {
    state: ProtectionState
    label: string
    count: number
    href: string
}

/**
 * The verdict (§5.3, §8.1): a three-state ring of COUNTS (22/30 — never a
 * percentage, never a score of the person), a mood chip, one verdict sentence,
 * one reassurance sentence, three filter tiles. The `quiet` variant fills the
 * ring and says the §6 quiet sentence. The ring carries a full text alternative.
 */
export function VerdictCard({
    counts,
    active,
    quiet,
    mood,
    sentence,
    reassurance,
    ringLabel,
    tiles,
    className,
}: {
    counts: Record<ProtectionState, number>
    active: number
    quiet: boolean
    mood: string
    sentence: string
    reassurance?: string
    /** The text alternative for the ring: «22 από 30 καλύπτονται, 5 κενά, 3 για έλεγχο». */
    ringLabel: string
    tiles: VerdictTile[]
    className?: string
}) {
    const [drawn, setDrawn] = useState(false)
    useEffect(() => {
        const id = window.requestAnimationFrame(() => setDrawn(true))
        return () => window.cancelAnimationFrame(id)
    }, [])
    const total = Math.max(active, 1)
    const C = 2 * Math.PI * 54
    const seg = (n: number) => (drawn ? (n / total) * C : 0)
    let offset = 0
    const arcs = (["covered", "gap", "review"] as const).map((state) => {
        const len = seg(counts[state])
        const dash = `${Math.max(len - (len > 0 ? 4 : 0), 0)} ${C}`
        const el = { state, dash, off: -offset }
        offset += len
        return el
    })
    return (
        <section aria-labelledby="verdict-title" className={cn("rounded-g-card border border-border-hair bg-surface-raised p-g-4 shadow-g-raised tablet:p-g-5", className)}>
            <div className="flex items-center gap-g-4">
                <svg viewBox="0 0 128 128" className="size-28 shrink-0 tablet:size-32" role="img" aria-label={ringLabel}>
                    <circle cx="64" cy="64" r="54" className="stroke-border-subtle" strokeWidth="12" fill="none" />
                    {arcs.map((a) => (
                        <circle
                            key={a.state}
                            cx="64" cy="64" r="54" fill="none" strokeWidth="12" strokeLinecap="round"
                            className={cn("g-ring-arc", a.state === "covered" && "stroke-state-covered", a.state === "gap" && "stroke-state-gap", a.state === "review" && "stroke-state-review")}
                            strokeDasharray={a.dash}
                            strokeDashoffset={a.off}
                            transform="rotate(-90 64 64)"
                        />
                    ))}
                    <text x="64" y="70" textAnchor="middle" className="fill-fg-primary font-display text-[1.7rem] font-bold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }} data-count="verdict.coveredOfActive">
                        {counts.covered}/{active}
                    </text>
                </svg>
                <div className="min-w-0">
                    <StatusChip state={quiet ? "covered" : counts.gap > 0 ? "gap" : counts.review > 0 ? "review" : "covered"}>{mood}</StatusChip>
                    <h2 id="verdict-title" className="mt-g-2 font-display text-g-title text-fg-primary">{sentence}</h2>
                    {reassurance && <p className="mt-g-1 text-g-app-body text-fg-secondary">{reassurance}</p>}
                </div>
            </div>
            <ul className="mt-g-4 grid grid-cols-3 gap-g-2" aria-label={ringLabel}>
                {tiles.map((t) => (
                    <li key={t.state}>
                        <Link
                            href={t.href}
                            className={cn(
                                "g-row-press flex min-h-16 flex-col justify-center rounded-g-control border px-g-3 py-g-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus",
                                t.state === "covered" && "border-state-covered-fill bg-state-covered-fill/40",
                                t.state === "gap" && "border-state-gap-border bg-state-gap-fill",
                                t.state === "review" && "border-border-subtle bg-state-review-fill"
                            )}
                        >
                            <span className={cn("font-display text-g-heading tabular-nums", t.state === "covered" && "text-state-covered", t.state === "gap" && "text-state-gap", t.state === "review" && "text-state-review")} data-count={`verdict.${t.state}Count`}>
                                {t.count}
                            </span>
                            <span className="text-g-app-caption text-fg-secondary">{t.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
