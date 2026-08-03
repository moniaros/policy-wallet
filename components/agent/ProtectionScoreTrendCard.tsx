"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { SCORE_CATEGORIES } from "@/lib/services/gap-engine/protection-score"

/** Bilingual category names live on SCORE_CATEGORIES — the same table the
 *  engine scores against, so a renamed category cannot drift out of the UI. */
const CATEGORY_LABELS = new Map(SCORE_CATEGORIES.map((c) => [c.key, c.label]))

interface TrendPoint {
    overallScore: number
    gapCount: number
    computedAt: string
}

interface TrendData {
    current: number | null
    earliest: number | null
    delta: number | null
    direction: "up" | "down" | "flat" | "unknown"
    points: TrendPoint[]
    movements: Array<{ key: string; from: number; to: number; delta: number }>
}

/**
 * Protection-score trend for one client (audit finding F-08).
 *
 * Fetched on mount rather than threaded through the server page: the trend is
 * supplementary, and a failure to load it must never take the client profile
 * down with it. Returns null (renders nothing) when the client has no history —
 * an empty chart is worse than no chart.
 */
export function ProtectionScoreTrendCard({ customerId }: { customerId: string }) {
    const { t, language } = useLanguage()
    const trend_t = t.agentUi.scoreTrend
    const [data, setData] = useState<TrendData | null>(null)
    const [state, setState] = useState<"loading" | "ready" | "empty">("loading")

    useEffect(() => {
        let cancelled = false
        // Imported lazily, NOT at module scope: a static import pulls the whole
        // server-actions module into every consumer's graph, which broke
        // ClientDetailView's jsdom tests on server-only env validation. It also
        // keeps the action out of the bundle until this card actually mounts.
        import("@/app/(protected)/agent/actions")
            .then(({ getCustomerScoreTrend }) => getCustomerScoreTrend(customerId))
            .then((result) => {
                if (cancelled) return
                if (!result || result.current === null || result.points.length === 0) {
                    setState("empty")
                    return
                }
                setData(result as TrendData)
                setState("ready")
            })
            .catch(() => {
                // Supplementary card — fail quiet rather than surfacing an error
                // that the advisor can do nothing about.
                if (!cancelled) setState("empty")
            })
        return () => {
            cancelled = true
        }
    }, [customerId])

    if (state === "loading") {
        return (
            <BrandCard className="p-5">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-16 w-full" />
            </BrandCard>
        )
    }

    if (state === "empty" || !data) return null

    const Icon =
        data.direction === "up" ? TrendingUp : data.direction === "down" ? TrendingDown : Minus
    const tone =
        data.direction === "up"
            ? "text-emerald-600 dark:text-emerald-400"
            : data.direction === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-neutral-500 dark:text-neutral-400"

    // Plot as a simple polyline: a dependency-free sparkline keeps this card
    // cheap, and the shape is all the advisor needs beside the numbers.
    const scores = data.points.map((p) => p.overallScore)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const span = max - min || 1
    const path = scores
        .map((score, i) => {
            const x = scores.length === 1 ? 50 : (i / (scores.length - 1)) * 100
            const y = 32 - ((score - min) / span) * 28
            return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(" ")

    return (
        <BrandCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary dark:text-mint shrink-0" />
                <h3 className="text-base font-bold text-foreground">{trend_t.title}</h3>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className="text-3xl font-black text-foreground tabular-nums">{data.current}</span>
                {data.delta !== null && data.delta !== 0 && (
                    <span className={`flex items-center gap-1 text-sm font-bold ${tone}`}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            {data.delta > 0 ? "+" : ""}
                            {data.delta}
                        </span>
                    </span>
                )}
            </div>

            {data.points.length > 1 && (
                <svg
                    viewBox="0 0 100 36"
                    preserveAspectRatio="none"
                    className="mt-3 w-full h-10"
                    role="img"
                    aria-label={trend_t.chartLabel}
                >
                    <polyline
                        points={path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className={tone}
                    />
                </svg>
            )}

            {data.movements.length > 0 && (
                <ul className="mt-4 space-y-1">
                    {data.movements.map((m) => (
                        <li
                            key={m.key}
                            className="flex items-center justify-between gap-3 text-xs font-medium text-neutral-600 dark:text-neutral-400"
                        >
                            <span className="truncate">
                                {CATEGORY_LABELS.get(m.key)?.[language === "el" ? "el" : "en"] ?? m.key}
                            </span>
                            <span
                                className={`tabular-nums font-bold shrink-0 ${
                                    m.delta > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-600 dark:text-red-400"
                                }`}
                            >
                                {m.delta > 0 ? "+" : ""}
                                {m.delta}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {trend_t.caption}
            </p>
        </BrandCard>
    )
}
