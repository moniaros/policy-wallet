import { describe, expect, it } from "vitest"

import {
    categoryMovements,
    summariseScoreTrend,
    type ScoreTrendPoint,
} from "@/lib/services/gap-engine/score-trend"

const at = (iso: string) => new Date(iso)

const point = (
    overallScore: number,
    computedAt: string,
    previousScore: number | null = null,
    gapCount = 0
): ScoreTrendPoint => ({ overallScore, previousScore, gapCount, computedAt: at(computedAt) })

describe("summariseScoreTrend", () => {
    it("reports unknown for a client who has never been scored", () => {
        const s = summariseScoreTrend([])
        expect(s).toMatchObject({ current: null, delta: null, direction: "unknown" })
    })

    it("tolerates null/undefined input", () => {
        expect(summariseScoreTrend(null).direction).toBe("unknown")
        expect(summariseScoreTrend(undefined).current).toBeNull()
    })

    it("treats a lone first-ever reading as a reading, not a trend", () => {
        const s = summariseScoreTrend([point(44, "2026-08-01")])
        expect(s.current).toBe(44)
        expect(s.delta).toBeNull()
        expect(s.direction).toBe("unknown")
    })

    it("uses a lone entry's own previousScore when it has one", () => {
        const s = summariseScoreTrend([point(61, "2026-08-01", 44)])
        expect(s.delta).toBe(17)
        expect(s.direction).toBe("up")
    })

    it("normalises newest-first rows to oldest-first", () => {
        // The query sorts newest-first (that is what the index supports); a
        // chart fed backwards draws every trend inverted.
        const s = summariseScoreTrend([
            point(72, "2026-08-03", 61),
            point(61, "2026-08-02", 44),
            point(44, "2026-08-01"),
        ])
        expect(s.points.map((p) => p.overallScore)).toEqual([44, 61, 72])
        expect(s.current).toBe(72)
        expect(s.direction).toBe("up")
    })

    it("measures from the window's baseline, not its first plotted point", () => {
        // first.previousScore is the score before the window opened, so
        // "since we started working together" stays honest when history clips.
        const s = summariseScoreTrend([
            point(61, "2026-08-02", 30),
            point(72, "2026-08-03", 61),
        ])
        expect(s.earliest).toBe(30)
        expect(s.delta).toBe(42)
    })

    it("reports a decline", () => {
        const s = summariseScoreTrend([
            point(80, "2026-08-01", 80),
            point(65, "2026-08-02", 80),
        ])
        expect(s.direction).toBe("down")
        expect(s.delta).toBe(-15)
    })

    it("reports flat when the score returned to where it started", () => {
        const s = summariseScoreTrend([
            point(70, "2026-08-01", 70),
            point(80, "2026-08-02", 70),
            point(70, "2026-08-03", 80),
        ])
        expect(s.direction).toBe("flat")
        expect(s.delta).toBe(0)
    })
})

describe("categoryMovements", () => {
    const rows = (a: Record<string, number>, b: Record<string, number>) => [
        { categoryScores: a, computedAt: at("2026-08-01") },
        { categoryScores: b, computedAt: at("2026-08-02") },
    ]

    it("needs two readings to say anything", () => {
        expect(categoryMovements([{ categoryScores: { health: 50 }, computedAt: at("2026-08-01") }])).toEqual([])
        expect(categoryMovements([])).toEqual([])
        expect(categoryMovements(null)).toEqual([])
    })

    it("lists movements largest-first", () => {
        const moves = categoryMovements(
            rows({ health: 0, property: 90, life: 50 }, { health: 40, property: 95, life: 20 })
        )
        expect(moves.map((m) => m.key)).toEqual(["health", "life", "property"])
        expect(moves[0]).toEqual({ key: "health", from: 0, to: 40, delta: 40 })
        expect(moves[1].delta).toBe(-30)
    })

    it("ignores categories that did not move", () => {
        expect(categoryMovements(rows({ health: 50 }, { health: 50 }))).toEqual([])
    })

    it("ignores the -1 not-applicable marker in either direction", () => {
        // A category BECOMING applicable is not a score movement and must not
        // render as a 141-point swing.
        expect(categoryMovements(rows({ life: -1 }, { life: 40 }))).toEqual([])
        expect(categoryMovements(rows({ life: 40 }, { life: -1 }))).toEqual([])
    })

    it("ignores categories absent from the earlier reading", () => {
        expect(categoryMovements(rows({}, { health: 60 }))).toEqual([])
    })

    it("survives malformed categoryScores json", () => {
        expect(categoryMovements(rows(null as any, { health: 60 }))).toEqual([])
        expect(categoryMovements(rows("nonsense" as any, "junk" as any))).toEqual([])
    })
})
