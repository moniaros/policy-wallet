import { describe, it, expect, vi, beforeEach } from "vitest"

const { dbMock, sendEmail } = await vi.hoisted(async () => ({
    dbMock: (await import("../helpers/notification-db-mock")).notificationDbMock(),
    sendEmail: vi.fn(async () => ({ success: true })),
}))

vi.mock("@/lib/db", () => ({ db: dbMock }))
vi.mock("@/lib/email/email-service", () => ({ sendEmail }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { emit } from "@/lib/notifications/dispatch"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"

const rows = () => dbMock.notificationEvent.create.mock.calls.map((c: any[]) => c[0].data)
const rowFor = (channel: string) => rows().find((r: any) => r.channel === channel)

describe("the dispatcher", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        dbMock.notificationEvent.create.mockResolvedValue({} as never)
        dbMock.notificationEvent.findFirst.mockResolvedValue(null as never)
        dbMock.notificationPreference.findMany.mockResolvedValue([] as never)
        dbMock.pushDevice.findMany.mockResolvedValue([] as never)
        // vi.clearAllMocks() clears call history but NOT implementations, so the
        // override a previous case installed would leak into this one.
        dbMock.notificationRuleOverride.findMany.mockResolvedValue([] as never)
        dbMock.notificationSetting.findMany.mockResolvedValue([] as never)
        dbMock.notificationTemplate.findMany.mockResolvedValue([] as never)
        dbMock.user.findUnique.mockResolvedValue({
            email: "owner@example.com",
            preferredLanguage: "en",
        } as never)
        delete process.env.VAPID_PUBLIC_KEY
        delete process.env.VAPID_PRIVATE_KEY
    })

    it("writes one row per attempted channel, all with the same copy", async () => {
        const result = await emit({
            event: "policy_analyzed",
            userId: "u1",
            title: { el: "Analysis complete", en: "Analysis complete" },
            message: { el: "Your policy was analysed.", en: "Your policy was analysed." },
        })

        // push is declared but unconfigured here, so it is not attempted and
        // writes NO row — you cannot audit a delivery the system could not make.
        expect(rows().map((r: any) => r.channel).sort()).toEqual(["email", "in_app"])
        expect(result.delivered.sort()).toEqual(["email", "in_app"])
        expect(new Set(rows().map((r: any) => r.title)).size).toBe(1)
    })

    it("records a suppressed channel as skipped, and still delivers the rest", async () => {
        dbMock.notificationPreference.findMany.mockResolvedValue([
            { channel: "email", enabled: false },
        ] as never)

        await emit({
            event: "policy_analyzed",
            userId: "u1",
            title: { el: "Analysis complete", en: "Analysis complete" },
            message: { el: "Your policy was analysed.", en: "Your policy was analysed." },
        })

        expect(rowFor("email").status).toBe("skipped")
        expect(rowFor("email").skipReason).toBe("preference_off")
        expect(rowFor("email").attempts).toBe(0)
        expect(rowFor("in_app").status).toBe("sent")
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("ignores preferences for a transactional event", async () => {
        dbMock.notificationPreference.findMany.mockResolvedValue([
            { channel: "email", enabled: false },
            { channel: "in_app", enabled: false },
        ] as never)

        await emit({
            event: "payment_failed",
            userId: "u1",
            title: { el: "Payment failed", en: "Payment failed" },
            message: { el: "Update your card.", en: "Update your card." },
        })

        // Nobody consents away from being told their card failed.
        for (const row of rows()) expect(row.skipReason).toBeNull()
        expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it("does not re-send when the dedupe key has already been used", async () => {
        dbMock.notificationEvent.findFirst.mockResolvedValue({ id: "existing" } as never)

        const result = await emit({
            event: "policy_expiring",
            userId: "u1",
            title: { el: "Expiring", en: "Expiring" },
            message: { el: "Soon", en: "Soon" },
            dedupeKey: "renewal:pol-1:30",
        })

        expect(result.deduped).toBe(true)
        expect(dbMock.notificationEvent.create).not.toHaveBeenCalled()
    })

    it("denormalizes priority and expiry from the registry", async () => {
        await emit({
            event: "policy_expiring",
            userId: "u1",
            title: { el: "Expiring", en: "Expiring" },
            message: { el: "Soon", en: "Soon" },
        })

        const def = NOTIFICATION_EVENTS.policy_expiring
        const row = rowFor("in_app")
        expect(row.priority).toBe(def.priority)
        // Short on purpose: a reminder for a renewal that has already passed is
        // worse than no reminder.
        const hours = (row.expiresAt.getTime() - Date.now()) / 3_600_000
        expect(Math.round(hours)).toBe(def.expiresAfterHours)
    })

    it("schedules a retry when a channel fails, and records why", async () => {
        sendEmail.mockResolvedValue({ success: false, error: "smtp down" } as never)

        const result = await emit({
            event: "policy_analyzed",
            userId: "u1",
            title: { el: "Analysis complete", en: "Analysis complete" },
            message: { el: "Your policy was analysed.", en: "Your policy was analysed." },
        })

        const row = rowFor("email")
        expect(row.status).toBe("failed")
        expect(row.failureReason).toBe("smtp down")
        expect(row.attempts).toBe(1)
        // The old code wrote failureReason and nothing ever read it again.
        expect(row.nextAttemptAt).toBeInstanceOf(Date)
        expect(result.failed).toEqual(["email"])
    })

    it("resolves copy to the recipient language, once", async () => {
        dbMock.user.findUnique.mockResolvedValue({
            email: "owner@example.com",
            preferredLanguage: "el",
        } as never)

        await emit({
            event: "policy_analyzed",
            userId: "u1",
            title: { el: "Ελληνικά", en: "English" },
            message: { el: "Μήνυμα", en: "Message" },
        })

        for (const row of rows()) {
            expect(row.title).toBe("Ελληνικά")
            expect(row.message).toBe("Μήνυμα")
        }
    })

    it("never throws, and writes nothing, for an unknown recipient", async () => {
        dbMock.user.findUnique.mockResolvedValue(null as never)

        const result = await emit({
            event: "policy_analyzed",
            userId: "ghost",
            title: { el: "t", en: "t" },
            message: { el: "m", en: "m" },
        })

        expect(result.written).toBe(0)
        expect(dbMock.notificationEvent.create).not.toHaveBeenCalled()
    })

    it("never throws when the database is down", async () => {
        dbMock.user.findUnique.mockRejectedValue(new Error("db down") as never)

        // A notification is a consequence of an action, never a precondition of
        // it: this must not roll back the upload that caused it.
        await expect(
            emit({ event: "policy_analyzed", userId: "u1", title: { el: "t", en: "t" }, message: { el: "m", en: "m" } })
        ).resolves.toMatchObject({ written: 0 })
    })

    it("drops a planned event rather than inventing a delivery for it", async () => {
        const result = await emit({
            event: "claim_opened",
            userId: "u1",
            title: { el: "t", en: "t" },
            message: { el: "m", en: "m" },
        })

        expect(result.written).toBe(0)
        expect(dbMock.notificationEvent.create).not.toHaveBeenCalled()
    })

    it("keeps the analytics mirror off every notification channel", async () => {
        await emit({
            event: "conv_checkout_started",
            userId: "u1",
            title: { el: "Checkout was started", en: "Checkout was started" },
            message: { el: "{}", en: "{}" },
        })

        expect(rows().map((r: any) => r.channel)).toEqual(["analytics"])
        expect(sendEmail).not.toHaveBeenCalled()
    })

    // ── Admin overrides ──────────────────────────────────────────────────────

    it("records a disabled trigger as skipped, never as nothing at all", async () => {
        dbMock.notificationRuleOverride.findMany.mockResolvedValue([
            { eventType: "policy_analyzed", enabled: false, priority: null, channels: null,
              retryAttempts: null, retryBackoff: null, retryBaseDelayMinutes: null,
              escalationAfterFailures: null, escalationAfterUnreadHours: null,
              expiresAfterHours: null, notes: null },
        ] as never)

        await emit({ event: "policy_analyzed", userId: "u1", title: { el: "t", en: "t" }, message: { el: "m", en: "m" } })

        // "We deliberately did not send this, and here is why" is exactly what an
        // audit needs — and what tells a paused system apart from a broken one.
        const rows = dbMock.notificationEvent.create.mock.calls.map((c: any[]) => c[0].data)
        expect(rows.length).toBeGreaterThan(0)
        for (const row of rows) {
            expect(row.status).toBe("skipped")
            expect(row.skipReason).toBe("trigger_disabled")
        }
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("pauses every channel when automations are paused", async () => {
        dbMock.notificationSetting.findMany.mockResolvedValue([
            { key: "automation.paused", value: true },
        ] as never)

        await emit({ event: "payment_failed", userId: "u1", title: { el: "t", en: "t" }, message: { el: "m", en: "m" } })

        const rows = dbMock.notificationEvent.create.mock.calls.map((c: any[]) => c[0].data)
        // Even a transactional, critical event: a pause is a pause, and the
        // record of what was withheld is the point.
        for (const row of rows) expect(row.skipReason).toBe("automations_paused")
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("records a globally disabled channel distinctly from an unbuilt one", async () => {
        dbMock.notificationSetting.findMany.mockResolvedValue([
            { key: "channel.email.enabled", value: false },
        ] as never)

        await emit({ event: "policy_analyzed", userId: "u1", title: { el: "t", en: "t" }, message: { el: "m", en: "m" } })

        // `channel_disabled` means an operator switched it off;
        // `transport_not_configured` means it was never built. Collapsing the two
        // would send an operator hunting for a bug in a working system.
        expect(rowFor("email").skipReason).toBe("channel_disabled")
        expect(rowFor("in_app").status).toBe("sent")
    })

    it("applies an admin priority and expiry override to the row", async () => {
        dbMock.notificationRuleOverride.findMany.mockResolvedValue([
            { eventType: "policy_analyzed", enabled: null, priority: "low", channels: null,
              retryAttempts: null, retryBackoff: null, retryBaseDelayMinutes: null,
              escalationAfterFailures: null, escalationAfterUnreadHours: null,
              expiresAfterHours: 6, notes: null },
        ] as never)

        await emit({ event: "policy_analyzed", userId: "u1", title: { el: "t", en: "t" }, message: { el: "m", en: "m" } })

        const row = rowFor("in_app")
        expect(row.priority).toBe("low")
        expect(Math.round((row.expiresAt.getTime() - Date.now()) / 3_600_000)).toBe(6)
    })

    it("uses an admin template and records the copy that was actually sent", async () => {
        dbMock.notificationTemplate.findMany.mockResolvedValue([
            {
                eventType: "policy_analyzed",
                channel: "in_app",
                locale: "en",
                subject: null,
                title: "Ready: {{policyNumber}}",
                body: "We finished reading {{policyNumber}} from {{insurerName}}.",
            },
        ] as never)

        await emit({
            event: "policy_analyzed",
            userId: "u1",
            title: { el: "caller title", en: "caller title" },
            message: { el: "caller message", en: "caller message" },
            vars: { policyNumber: "POL-9", insurerName: "Interamerican" },
        })

        // A delivery log showing copy the recipient never saw would be useless
        // for the one job it has.
        expect(rowFor("in_app").title).toBe("Ready: POL-9")
        expect(rowFor("in_app").message).toBe("We finished reading POL-9 from Interamerican.")
        // The email channel has no template, so it keeps the caller's own copy.
        expect(rowFor("email").title).toBe("caller title")
    })

    it("falls back to the caller's copy when templates are switched off", async () => {
        dbMock.notificationSetting.findMany.mockResolvedValue([
            { key: "flag.templatesEnabled", value: false },
        ] as never)
        dbMock.notificationTemplate.findMany.mockResolvedValue([
            { eventType: "policy_analyzed", channel: "in_app", locale: "en",
              subject: null, title: "templated", body: "templated body" },
        ] as never)

        await emit({ event: "policy_analyzed", userId: "u1", title: { el: "caller title", en: "caller title" }, message: { el: "caller message", en: "caller message" } })

        // The safety switch if a template goes wrong in production.
        expect(rowFor("in_app").title).toBe("caller title")
    })

    it("still sends on registry defaults when the config table is unreadable", async () => {
        dbMock.notificationRuleOverride.findMany.mockRejectedValue(new Error("db down") as never)

        const result = await emit({ event: "policy_analyzed", userId: "u1", title: { el: "t", en: "t" }, message: { el: "m", en: "m" } })

        // The whole point of an override layer is that it is optional.
        expect(result.delivered).toContain("in_app")
        expect(rowFor("in_app").priority).toBe(NOTIFICATION_EVENTS.policy_analyzed.priority)
    })
})
