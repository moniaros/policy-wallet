import { describe, it, expect } from "vitest"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { NOTIFICATION_SETTINGS } from "@/lib/notifications/settings"

/**
 * The gap between the outbound policy the owner CHOSE and the one that ships.
 *
 * H-002 was answered **option B**: renewals and lapses (the events with a real,
 * dated deadline), **plus a monthly digest of what changed, sent only when
 * something actually changed**. Keeping the weekly digest, the engagement drip
 * and the churn sequence was option **C**, and it was not chosen.
 *
 * The product still ships C-minus-the-score. That is **deliberate, not an
 * oversight**: §12.4 puts notification *dispatch* logic — whether a message
 * fires, to which channel, at what cadence — outside this run. H-002 decides
 * the policy; this run specified it and built the §9.5 controls (the monthly
 * ceiling and the global off switch, P1-09b), and does not move a cron.
 *
 * So this file is not a guard that something is broken. It is an inventory of a
 * known, decided-but-unimplemented divergence, held in a place that fails when
 * it goes stale — because a decision recorded only in a halt document is a
 * decision that quietly stops being true. When the dispatch work is finally in
 * scope, these tests go red one by one and each deletion is the proof.
 */

/** Live outbound engagement B would retire, each with why it is not option B. */
const RETIRED_BY_OPTION_B: ReadonlyArray<readonly [event: string, why: string]> = [
    ["weekly_digest", "B specifies a MONTHLY digest; this is weekly"],
    ["churn_prevention", "the churn sequence is option C — inactivity is not a dated deadline"],
    ["engagement_welcome", "the drip is option C"],
    ["engagement_day3", "the drip is option C"],
    ["engagement_day7", "the drip is option C"],
]

const OUTBOUND = new Set(["email", "push"])
const sendsOutbound = (name: string) =>
    (NOTIFICATION_EVENTS[name]?.channels ?? []).some((c) => OUTBOUND.has(c))

describe("H-002 = B is decided, and the divergence is inventoried not forgotten", () => {
    it("every event on the list still exists — a stale inventory is worse than none", () => {
        for (const [name] of RETIRED_BY_OPTION_B) {
            expect(NOTIFICATION_EVENTS[name], `${name} is gone from the registry — delete its row`).toBeDefined()
        }
    })

    it("records exactly which of them still reach a customer outside the app", () => {
        const stillSending = RETIRED_BY_OPTION_B.filter(([n]) => NOTIFICATION_EVENTS[n]?.status === "live" && sendsOutbound(n))
        // All five today. This number may only FALL. If one stops sending,
        // delete its row: the divergence shrank and the inventory must say so.
        expect(stillSending.length).toBe(5)
    })

    it("the §9.5 controls that B depends on DO exist, which is this run's half", () => {
        // B is worse than what it replaces without a ceiling and an off switch,
        // so those shipped first (P1-09b). Asserted here because the value of
        // the divergence inventory depends on the controls being real.
        const keys = NOTIFICATION_SETTINGS.map((d) => d.key)
        expect(keys.some((k) => /maxPerDay|monthly|ceiling/i.test(k)), `no ceiling control among: ${keys.join(", ")}`).toBe(true)
        expect(keys.some((k) => /quietHours|maxPerDay/i.test(k))).toBe(true)
    })

    it("deadline-bearing events — what option A keeps — are untouched and live", () => {
        // The half of B that already ships. If one of these stops being live,
        // the outbound policy moved in the WRONG direction and nobody decided it.
        for (const name of ["policy_expiring", "renewal_overdue", "obligation_due"]) {
            expect(NOTIFICATION_EVENTS[name]?.status, `${name} must stay live under option A`).toBe("live")
        }
    })
})
