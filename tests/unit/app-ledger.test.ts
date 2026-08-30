import { describe, it, expect, vi, beforeEach } from "vitest"

const groupBy = vi.fn()
vi.mock("@/lib/db", () => ({ db: { businessEvent: { groupBy: (...a: unknown[]) => groupBy(...a) } } }))

import { loadLedgerCounts } from "@/lib/app/ledger"

/**
 * G11 done-criterion: the ledger renders FROM events. Seeded rows produce
 * lines; an empty year produces zero counts (the screen then renders the
 * honest empty sentence, asserted in app-screens-budget). No table exists —
 * the projection reads BusinessEvent only, this year only, replays excluded.
 */
describe("«Τι έκανα για εσάς φέτος» is a projection over BusinessEvent", () => {
    beforeEach(() => groupBy.mockReset())

    it("counts each line from its event names, this year, replays excluded", async () => {
        groupBy.mockResolvedValue([
            { name: "policy.analysis_completed", _count: { _all: 21 } },
            { name: "policy.renewal_approaching", _count: { _all: 3 } },
            { name: "finding.shown", _count: { _all: 29 } },
            { name: "advisor.help_requested", _count: { _all: 1 } },
        ])
        const now = new Date("2026-08-30T12:00:00Z")
        const counts = await loadLedgerCounts("u1", now)
        expect(counts).toEqual({ policiesRead: 21, renewalsCaught: 3, findingsShown: 29, benefitsSurfaced: 0, questionsAnswered: 0, helpRequests: 1, year: 2026 })
        const args = groupBy.mock.calls[0][0] as { where: Record<string, unknown> }
        expect(args.where.subjectUserId).toBe("u1")
        expect(args.where.isReplay).toBe(false)
        expect((args.where.occurredAt as { gte: Date }).gte.toISOString()).toBe("2026-01-01T00:00:00.000Z")
    })

    it("an empty year is zero everywhere — nothing is invented", async () => {
        groupBy.mockResolvedValue([])
        const counts = await loadLedgerCounts("u1", new Date("2026-02-01"))
        expect(Object.entries(counts).filter(([k]) => k !== "year").every(([, v]) => v === 0)).toBe(true)
    })
})
