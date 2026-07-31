/**
 * WP-10 — the renewal count on the dashboard was the capped one.
 *
 * The six-month timeline was built inline on /home: filter to policies expiring
 * within 180 days, sort, `slice(0, 6)`. The card then printed `items.length`
 * beside its heading as the number of upcoming renewals — so a household with
 * nine renewals due was told it had **six**. Not a truncated list with a hint
 * that more existed: a wrong count, stated as fact, about the reader's own
 * portfolio. And the three that fell off were the furthest out, which is
 * precisely the group a six-month view exists to surface early.
 *
 * The model is separated from the card so `total` and `hidden` come back
 * alongside `items` — and so the window, the ordering and the boundaries can be
 * checked without a browser, which the inline version could not be.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
    RENEWAL_TIMELINE_LIMIT,
    RENEWAL_WINDOW_DAYS,
    buildRenewalTimeline,
} from "@/lib/wallet/renewal-timeline"

const NOW = new Date("2026-07-31T12:00:00Z")
const DAY = 24 * 60 * 60 * 1000

/** A policy that expires `days` from NOW. */
const at = (days: number) => ({ id: `p${days}`, end: new Date(NOW.getTime() + days * DAY) })
const resolve = (p: { end: Date | null }) => p.end

describe("the six-month window", () => {
    it("keeps only what renews inside it, soonest first", () => {
        const timeline = buildRenewalTimeline(
            [at(200), at(10), at(45), at(-5)],
            resolve,
            NOW
        )

        expect(timeline.items.map((i) => i.policy.id)).toEqual(["p10", "p45"])
    })

    it("excludes a policy that has already expired", () => {
        // It belongs to a lapsed-cover surface, not an upcoming-renewal one.
        expect(buildRenewalTimeline([at(-1)], resolve, NOW).total).toBe(0)
    })

    it("includes one sitting exactly on the window edge", () => {
        // Excluding it would make the same policy appear and disappear between
        // two refreshes of the same page.
        expect(buildRenewalTimeline([at(RENEWAL_WINDOW_DAYS)], resolve, NOW).total).toBe(1)
        expect(buildRenewalTimeline([at(RENEWAL_WINDOW_DAYS + 1)], resolve, NOW).total).toBe(0)
    })

    it("skips policies with no resolvable end date", () => {
        const timeline = buildRenewalTimeline(
            [{ id: "unknown", end: null }, at(30)],
            resolve,
            NOW
        )

        expect(timeline.items.map((i) => i.policy.id)).toEqual(["p30"])
    })
})

describe("the display cap is reported, not swallowed", () => {
    const nine = Array.from({ length: 9 }, (_, i) => at((i + 1) * 10))

    it("counts everything in the window, not just what is shown", () => {
        // The defect, stated directly: nine due renewals must not read as six.
        const timeline = buildRenewalTimeline(nine, resolve, NOW)

        expect(timeline.items).toHaveLength(RENEWAL_TIMELINE_LIMIT)
        expect(timeline.total).toBe(9)
        expect(timeline.hidden).toBe(3)
    })

    it("shows the soonest ones and hides the furthest out", () => {
        const timeline = buildRenewalTimeline(nine, resolve, NOW)

        expect(timeline.items[0].policy.id).toBe("p10")
        expect(timeline.items.map((i) => i.policy.id)).not.toContain("p90")
    })

    it("reports nothing hidden when everything fits", () => {
        const timeline = buildRenewalTimeline([at(10), at(20)], resolve, NOW)

        expect(timeline.total).toBe(2)
        expect(timeline.hidden).toBe(0)
    })

    it("caps at a limit worth having", () => {
        // Vacuity floor: a limit of 0 would make `hidden` always positive and
        // every assertion above meaningless.
        expect(RENEWAL_TIMELINE_LIMIT).toBeGreaterThan(1)
        expect(RENEWAL_WINDOW_DAYS).toBeGreaterThan(30)
    })
})

describe("the card reports the true number", () => {
    const CARD = readFileSync("components/dashboard/home/RenewalsTimelineCard.tsx", "utf-8")
    const HOME = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf-8")

    it("prints the window total beside the heading, not the capped length", () => {
        const heading = CARD.split("pw-kicker")[1]?.split("</div>")[0] ?? ""

        expect(heading).toContain("{total}")
        expect(heading).not.toContain("items.length")
    })

    it("offers a way to reach what the cap left out", () => {
        expect(CARD).toContain("hidden > 0")
        expect(CARD).toContain("moreRenewals")
        expect(CARD).toContain('href="/renewals"')
    })

    it("is fed from the shared model rather than a second inline slice", () => {
        expect(HOME).toContain("buildRenewalTimeline")
        expect(HOME).toContain("total={renewalTimeline.total}")
        expect(HOME).toContain("hidden={renewalTimeline.hidden}")
        // The inline 180-day window and the .slice(0, 6) are gone.
        expect(HOME).not.toContain("180 * 24 * 60 * 60 * 1000")
        expect(HOME).not.toContain("upcomingRenewals.slice(0, 6)")
    })
})
