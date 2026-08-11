import { describe, it, expect } from "vitest"
import { assembleWatch } from "@/lib/services/risk-dna/service"

/**
 * Guards for the dashboard's watch assembly.
 *
 * `assembleWatch` is the pure seam the dashboard uses instead of
 * `getRiskIntelligence` (which re-fetches everything and computes views the
 * dashboard never renders). The contract under test: all four signals always
 * report (clear is a result), and the freshness signal reads the caller's
 * `lastAssessedAt` — the last engine RUN — not the newest version's timestamp,
 * which only moves on material change.
 */

const NOW = new Date("2026-08-11T10:00:00Z")

const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000)

function policy(overrides: Record<string, unknown> = {}) {
    return {
        id: "p1",
        lineOfBusiness: "motor",
        status: "active",
        insurerName: "Test Insurer",
        endDate: daysFromNow(200),
        acordData: null,
        ...overrides,
    }
}

describe("assembleWatch", () => {
    it("always reports all four signals, clear included, even for an empty account", () => {
        const signals = assembleWatch({
            profile: null,
            policies: [],
            latestVersion: null,
            lastAssessedAt: null,
            now: NOW,
        })
        expect(signals.map((s) => s.id)).toEqual([
            "cover_lapsing",
            "dimensions_worsening",
            "picture_stale",
            "critical_open",
        ])
        expect(signals.find((s) => s.id === "cover_lapsing")?.verdict).toBe("clear")
    })

    it("raises the lapse signal when a policy ends within 45 days", () => {
        const signals = assembleWatch({
            profile: null,
            policies: [policy({ endDate: daysFromNow(30) })],
            latestVersion: null,
            lastAssessedAt: NOW,
            now: NOW,
        })
        expect(signals.find((s) => s.id === "cover_lapsing")?.verdict).toBe("action")
    })

    it("reads freshness from lastAssessedAt, not from the version timestamp", () => {
        // The newest version is 300 days old — but versions only move on
        // MATERIAL change. The engine re-checked yesterday; the watch must not
        // tell a stable customer their position went unassessed for a year.
        const signals = assembleWatch({
            profile: null,
            policies: [policy()],
            latestVersion: { computedAt: daysFromNow(-300), risks: [] },
            lastAssessedAt: daysFromNow(-1),
            now: NOW,
        })
        expect(signals.find((s) => s.id === "picture_stale")?.verdict).toBe("clear")
    })

    it("flags a never-assessed account as attention, with honest wording", () => {
        const signals = assembleWatch({
            profile: null,
            policies: [policy()],
            latestVersion: null,
            lastAssessedAt: null,
            now: NOW,
        })
        const stale = signals.find((s) => s.id === "picture_stale")
        expect(stale?.verdict).toBe("attention")
        expect(stale?.detail?.en).toMatch(/not assessed/i)
    })
})
