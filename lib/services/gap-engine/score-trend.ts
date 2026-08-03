/**
 * Protection-score trend (audit finding F-08).
 *
 * `ProtectionScore` keeps only the latest value, so until `ProtectionScoreHistory`
 * existed an advisor could not say "your protection improved after we added life
 * cover" — the sentence the product exists to support. These helpers are pure so
 * the direction/summary logic is testable without a database.
 */

export interface ScoreTrendPoint {
    overallScore: number
    previousScore: number | null
    gapCount: number
    computedAt: Date
}

export type TrendDirection = "up" | "down" | "flat" | "unknown"

export interface ScoreTrendSummary {
    /** Most recent score, or null when the client has never been scored. */
    current: number | null
    /** Score at the start of the window, for "since you joined" style copy. */
    earliest: number | null
    /** current - earliest; null when there is nothing to compare against. */
    delta: number | null
    direction: TrendDirection
    /** Points oldest-first, ready to plot. */
    points: ScoreTrendPoint[]
}

/**
 * Reduce raw history rows to something a card can render.
 *
 * Accepts rows in ANY order and normalises to oldest-first: the query that
 * feeds this sorts newest-first (that is what the index supports), and a chart
 * fed backwards silently draws every trend inverted.
 */
export function summariseScoreTrend(
    rows: ScoreTrendPoint[] | null | undefined
): ScoreTrendSummary {
    const points = [...(rows ?? [])].sort(
        (a, b) => a.computedAt.getTime() - b.computedAt.getTime()
    )

    if (points.length === 0) {
        return { current: null, earliest: null, delta: null, direction: "unknown", points }
    }

    const current = points[points.length - 1].overallScore

    // A single entry is a reading, not a trend. Its own previousScore is the
    // only earlier value on record — use it when present rather than claiming
    // the client has been flat.
    if (points.length === 1) {
        const prior = points[0].previousScore
        if (prior === null || prior === undefined) {
            return { current, earliest: current, delta: null, direction: "unknown", points }
        }
        return {
            current,
            earliest: prior,
            delta: current - prior,
            direction: directionOf(current - prior),
            points,
        }
    }

    // Prefer the first point's own previousScore as the baseline: it is the
    // score before the window opened, so "since we started working together"
    // stays honest even when the window clips older history.
    const first = points[0]
    const earliest = first.previousScore ?? first.overallScore
    const delta = current - earliest

    return { current, earliest, delta, direction: directionOf(delta), points }
}

function directionOf(delta: number): TrendDirection {
    if (delta > 0) return "up"
    if (delta < 0) return "down"
    return "flat"
}

/**
 * The advisor-facing headline: which score categories moved, best first.
 *
 * Categories are compared between the two most recent readings — that is the
 * change the advisor just caused, and the one worth talking about.
 */
export function categoryMovements(
    rows: Array<{ categoryScores: unknown; computedAt: Date }> | null | undefined
): Array<{ key: string; from: number; to: number; delta: number }> {
    const points = [...(rows ?? [])].sort(
        (a, b) => a.computedAt.getTime() - b.computedAt.getTime()
    )
    if (points.length < 2) return []

    const before = asScoreMap(points[points.length - 2].categoryScores)
    const after = asScoreMap(points[points.length - 1].categoryScores)

    const movements: Array<{ key: string; from: number; to: number; delta: number }> = []
    for (const [key, to] of Object.entries(after)) {
        const from = before[key]
        // -1 is the engine's "not applicable" marker; a category becoming
        // applicable is not a score movement and must not read as one.
        if (from === undefined || from === -1 || to === -1) continue
        if (from === to) continue
        movements.push({ key, from, to, delta: to - from })
    }

    return movements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

function asScoreMap(raw: unknown): Record<string, number> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
    const out: Record<string, number> = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === "number" && Number.isFinite(value)) out[key] = value
    }
    return out
}
