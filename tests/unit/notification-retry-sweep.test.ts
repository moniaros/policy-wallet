import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "node:fs"

/**
 * The retry sweep had no test at all, which is how the escalation defect below
 * survived: a date-stamped dedupe key meant a permanently failed notification —
 * a dead address, a bounced domain — re-escalated to every admin on every
 * nightly run, for as long as the row existed.
 *
 * That is not a small annoyance. An escalation that arrives every morning
 * whether or not anything changed is one a team learns to filter, and a
 * filtered escalation is the same as no escalation: the mechanism that exists
 * to surface a customer whose payments keep failing stops working, silently.
 */

const emitMock = vi.fn(
    async (_args: { dedupeKey?: string; [k: string]: unknown }) =>
        ({ written: 1, deduped: false, deferred: false })
)

const rows: any[] = []
const dbMock = {
    notificationEvent: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async (args: any) => {
            // The escalation pass is the only one selecting `attempts` + `title`.
            if (args?.select?.title && args?.where?.status?.in) {
                lastEscalationQuery = args
                return rows
            }
            return []
        }),
        update: vi.fn(async () => ({})),
    },
    user: {
        findMany: vi.fn(async () => [{ id: "admin-1" }]),
    },
}

let lastEscalationQuery: any = null

vi.mock("@/lib/db", () => ({ db: dbMock }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/notifications/dispatch", () => ({ emit: emitMock }))
vi.mock("./dispatch", () => ({ emit: emitMock }))
// Partial mock: the sweep now also reaches this module for IMPLEMENTED_CHANNELS
// (via cadence → preference-channels), so the real exports are kept and only
// the transport seam is stubbed.
vi.mock("@/lib/notifications/channels", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/notifications/channels")>()),
    deliver: vi.fn(async () => ({ status: "sent" })),
    isTransportConfigured: () => true,
}))
vi.mock("./channels", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/notifications/channels")>()),
    deliver: vi.fn(async () => ({ status: "sent" })),
    isTransportConfigured: () => true,
}))
vi.mock("@/lib/notifications/config", () => ({
    getNotificationConfig: async () => ({
        events: {
            payment_failed: {
                escalation: { afterFailures: 3, event: "admin_escalation" },
                retry: { attempts: 5, backoff: "exponential", baseDelayMinutes: 5 },
                channels: ["email"],
            },
        },
        settings: {},
    }),
}))
vi.mock("./config", () => ({
    getNotificationConfig: async () => ({
        events: {
            payment_failed: {
                escalation: { afterFailures: 3, event: "admin_escalation" },
                retry: { attempts: 5, backoff: "exponential", baseDelayMinutes: 5 },
                channels: ["email"],
            },
        },
        settings: {},
    }),
}))
vi.mock("@/lib/notifications/settings", () => ({
    settingValue: (_s: unknown, key: string) => (key === "automation.retryBatchSize" ? 100 : true),
}))
vi.mock("./settings", () => ({
    settingValue: (_s: unknown, key: string) => (key === "automation.retryBatchSize" ? 100 : true),
}))

async function sweep(now: Date) {
    vi.resetModules()
    const { runNotificationRetrySweep } = await import("@/lib/notifications/retry")
    return runNotificationRetrySweep(now)
}

describe("an exhausted notification escalates exactly once", () => {
    beforeEach(() => {
        emitMock.mockClear()
        rows.length = 0
        rows.push({
            id: "notif-1",
            userId: "customer-1",
            eventType: "payment_failed",
            attempts: 3,
            title: "Payment failed",
        })
    })

    it("keys the escalation on the failing row, not on the calendar day", async () => {
        // A date in the key means "once per day, for ever". Keyed on the row it
        // means "once, ever" — and a genuinely new failure is a new row, so a
        // recurrence months later still escalates.
        await sweep(new Date("2026-08-10T02:00:00Z"))
        const firstKey = emitMock.mock.calls[0]?.[0]?.dedupeKey

        emitMock.mockClear()
        await sweep(new Date("2026-08-11T02:00:00Z"))
        const secondKey = emitMock.mock.calls[0]?.[0]?.dedupeKey

        expect(firstKey, "no escalation was emitted at all").toBe("escalation:notif-1")
        expect(
            secondKey,
            "the next night's sweep produced a different dedupe key, so the same " +
                "failure escalates again — this is the defect the file guards"
        ).toBe(firstKey)
    })

    it("a different failure still escalates", async () => {
        await sweep(new Date("2026-08-10T02:00:00Z"))
        const first = emitMock.mock.calls[0]?.[0]?.dedupeKey

        emitMock.mockClear()
        rows[0] = { ...rows[0], id: "notif-2" }
        await sweep(new Date("2026-08-10T02:00:00Z"))

        expect(emitMock.mock.calls[0]?.[0]?.dedupeKey).not.toBe(first)
    })

    it("does not escalate below the failure threshold", async () => {
        rows[0].attempts = 2 // rule fires at 3
        await sweep(new Date("2026-08-10T02:00:00Z"))
        expect(emitMock).not.toHaveBeenCalled()
    })

    it("only reconsiders recent failures", async () => {
        // Without a window the sweep rescans every failure the table has ever
        // held, every night, for the life of the product.
        await sweep(new Date("2026-08-10T02:00:00Z"))
        expect(lastEscalationQuery?.where?.createdAt?.gte).toBeInstanceOf(Date)
        const cutoff = lastEscalationQuery.where.createdAt.gte as Date
        expect(new Date("2026-08-10T02:00:00Z").getTime() - cutoff.getTime()).toBeGreaterThan(0)
    })
})

describe("the sweep's order is load-bearing", () => {
    it("expires before it retries", () => {
        // Spending a retry on a message that is no longer true is worse than
        // not delivering it: a renewal reminder after the renewal has passed.
        const src = readFileSync("lib/notifications/retry.ts", "utf-8")
        const expireAt = src.indexOf("── 1. Expire")
        const escalateAt = src.indexOf("── 2. Escalate")
        const retryAt = src.indexOf("── 3. Retry")
        expect(expireAt).toBeGreaterThan(-1)
        expect(escalateAt).toBeGreaterThan(expireAt)
        expect(retryAt).toBeGreaterThan(escalateAt)
    })
})
