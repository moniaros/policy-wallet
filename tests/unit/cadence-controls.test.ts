/**
 * The §9.5 cadence controls — seam tests (P1-09b).
 *
 * H-002 was answered with option B, and B depends on two USER controls that
 * must be READ AT SEND TIME: a global off switch for everything that reaches
 * the customer outside the app, and a monthly ceiling on non-deadline
 * outbound. A preference the send path never consults is a dark pattern with
 * a checkbox, so — exactly like P1-09's stream switches — these tests assert
 * DISPATCHER OUTCOMES: the skip reason on the row, and the transport that was
 * (or was not) invoked. They do not assert that settings rows exist.
 *
 * Storage under test:
 *   - off switch      → user_notification_settings.max_per_day = 0 (explicit),
 *                       read per-recipient by lib/notifications/cadence.ts
 *   - monthly ceiling → policyholder_profiles.preferences.outboundMonthlyCeiling
 *
 * The non-defeatability rule, stated once: the off switch is NOT a rate
 * limit. It must hold with `orchestrator.rateLimitEnabled` switched off by an
 * admin, because a customer's "no" must never depend on an operator toggle.
 *
 * Every suppression case here has a control twin proving the identical
 * emission DOES reach the transport when the gate is open — so a green run
 * demonstrates flow-through, not a path that was never exercised.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { dbMock, sendEmail, sendWebPush } = await vi.hoisted(async () => ({
    dbMock: (await import("../helpers/notification-db-mock")).notificationDbMock(),
    sendEmail: vi.fn(async () => ({ success: true })),
    sendWebPush: vi.fn(async () => ({ ok: true as const })),
}))

vi.mock("@/lib/db", () => ({ db: dbMock }))
vi.mock("@/lib/email/email-service", () => ({ sendEmail }))
vi.mock("@/lib/push/web-push", () => ({ sendWebPush }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { emit } from "@/lib/notifications/dispatch"
import { orchestrate } from "@/lib/notifications/orchestrator"
import { runNotificationRetrySweep } from "@/lib/notifications/retry"

const rows = () => dbMock.notificationEvent.create.mock.calls.map((c: any[]) => c[0].data)
const rowFor = (channel: string) => rows().find((r: any) => r.channel === channel)

/** An engagement email the user could receive — the class both controls govern. */
const digest = () =>
    emit({
        event: "weekly_digest",
        userId: "u1",
        title: { el: "Η εβδομάδα σας", en: "Your week" },
        message: { el: "Σύνοψη", en: "Summary" },
    })

const storedSettings = (patch: Record<string, unknown>) =>
    dbMock.userNotificationSettings.findUnique.mockResolvedValue({
        userId: "u1",
        timezone: "Europe/Athens",
        quietHoursEnabled: false,
        quietHoursStart: 22,
        quietHoursEnd: 8,
        maxPerDay: null,
        digestMode: "immediate",
        ...patch,
    } as never)

beforeEach(() => {
    vi.clearAllMocks()
    dbMock.notificationEvent.create.mockResolvedValue({} as never)
    dbMock.notificationEvent.findFirst.mockResolvedValue(null as never)
    dbMock.notificationEvent.findMany.mockResolvedValue([] as never)
    dbMock.notificationEvent.count.mockResolvedValue(0 as never)
    dbMock.notificationPreference.findMany.mockResolvedValue([] as never)
    dbMock.pushDevice.findMany.mockResolvedValue([] as never)
    dbMock.notificationRuleOverride.findMany.mockResolvedValue([] as never)
    dbMock.notificationSetting.findMany.mockResolvedValue([] as never)
    dbMock.notificationTemplate.findMany.mockResolvedValue([] as never)
    dbMock.userNotificationSettings.findUnique.mockResolvedValue(null as never)
    dbMock.policyholderProfile.findUnique.mockResolvedValue(null as never)
    dbMock.user.findUnique.mockResolvedValue({
        email: "owner@example.com",
        preferredLanguage: "el",
        roles: "policyholder",
    } as never)
    delete process.env.VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
})

describe("the global off switch (maxPerDay = 0)", () => {
    it("control: with nothing stored, the same emission reaches the email transport", async () => {
        const result = await digest()

        expect(sendEmail).toHaveBeenCalledTimes(1)
        expect(result.delivered).toContain("email")
    })

    it("skips every outbound channel, records why, and keeps the in-app record", async () => {
        storedSettings({ maxPerDay: 0 })

        await digest()

        const email = rowFor("email")
        expect(email.status).toBe("skipped")
        expect(email.skipReason).toBe("user_outbound_off")
        expect(email.attempts).toBe(0)
        // The in-app timeline is the customer's own record, not an
        // interruption — the off switch must not erase their history.
        expect(rowFor("in_app").status).toBe("sent")
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("holds when an admin disables platform rate limiting — the off switch is not a rate limit", async () => {
        storedSettings({ maxPerDay: 0 })
        dbMock.notificationSetting.findMany.mockResolvedValue([
            { key: "orchestrator.rateLimitEnabled", value: false },
        ] as never)

        await digest()

        expect(rowFor("email").skipReason).toBe("user_outbound_off")
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("does not silence transactional mail — nobody consents away a failed payment", async () => {
        storedSettings({ maxPerDay: 0 })

        await emit({
            event: "payment_failed",
            userId: "u1",
            title: { el: "Αποτυχία πληρωμής", en: "Payment failed" },
            message: { el: "Ενημερώστε την κάρτα σας.", en: "Update your card." },
        })

        expect(rowFor("email").status).toBe("sent")
        expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it("is a skip through the orchestrator, never a deferral the sweep would later send", async () => {
        storedSettings({ maxPerDay: 0 })

        await orchestrate({
            event: "weekly_digest",
            subjectUserId: "u1",
            title: { el: "Η εβδομάδα σας", en: "Your week" },
            message: { el: "Σύνοψη", en: "Summary" },
        })

        // Before this control existed, a cap of 0 fell into the rate-limit
        // branch: `already >= 0` is always true, so the email was queued for
        // tomorrow — and the sweep sent it then, without re-asking. A one-day
        // delay is not "off".
        const email = rowFor("email")
        expect(email.status).toBe("skipped")
        expect(email.skipReason).toBe("user_outbound_off")
        expect(email.scheduledFor ?? null).toBeNull()
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("fails open when the settings row is unreadable — a DB blip must not silence delivery", async () => {
        dbMock.userNotificationSettings.findUnique.mockRejectedValue(new Error("db down") as never)

        await digest()

        expect(sendEmail).toHaveBeenCalledTimes(1)
        expect(rowFor("email").status).toBe("sent")
    })
})

describe("the sweep re-checks the gate — a stored row is not a bypass", () => {
    const queuedRow = (patch: Record<string, unknown> = {}) => ({
        id: "n1",
        userId: "u1",
        eventType: "weekly_digest",
        channel: "email",
        title: "Η εβδομάδα σας",
        message: "Σύνοψη",
        relatedObjectType: null,
        relatedObjectId: null,
        attempts: 0,
        scheduledFor: new Date(Date.now() - 3600_000),
        expiresAt: null,
        ...patch,
    })

    /** Route the sweep's three findMany passes; only the requested one yields. */
    const sweepRows = (which: "queued" | "failed", row: Record<string, unknown>) => {
        dbMock.notificationEvent.findMany.mockImplementation(async (args: any) => {
            const status = args?.where?.status
            if (which === "queued" && status === "queued") return [row]
            if (which === "failed" && status === "failed" && args?.where?.nextAttemptAt) return [row]
            return []
        })
    }

    beforeEach(() => {
        dbMock.notificationEvent.update.mockResolvedValue({} as never)
        dbMock.notificationEvent.updateMany.mockResolvedValue({ count: 0 } as never)
    })

    it("control: a due deferred row is delivered when the gate is open", async () => {
        sweepRows("queued", queuedRow())

        const summary = await runNotificationRetrySweep()

        expect(sendEmail).toHaveBeenCalledTimes(1)
        expect(summary.scheduled).toBe(1)
    })

    it("a row queued before the user switched off is skipped at delivery, not sent", async () => {
        sweepRows("queued", queuedRow())
        storedSettings({ maxPerDay: 0 })

        await runNotificationRetrySweep()

        expect(sendEmail).not.toHaveBeenCalled()
        const update = (dbMock.notificationEvent.update as any).mock.calls.find(
            (c: any[]) => c[0].where.id === "n1"
        )
        expect(update[0].data.status).toBe("skipped")
        expect(update[0].data.skipReason).toBe("user_outbound_off")
    })

    it("a failed row is not retried into a mailbox the user has closed", async () => {
        sweepRows("failed", queuedRow({ status: "failed", nextAttemptAt: new Date(Date.now() - 60_000), scheduledFor: null }))
        storedSettings({ maxPerDay: 0 })

        await runNotificationRetrySweep()

        expect(sendEmail).not.toHaveBeenCalled()
        const update = (dbMock.notificationEvent.update as any).mock.calls.find(
            (c: any[]) => c[0].where.id === "n1"
        )
        expect(update[0].data.status).toBe("skipped")
        expect(update[0].data.skipReason).toBe("user_outbound_off")
    })
})

describe("the monthly ceiling (non-deadline outbound)", () => {
    const ceiling = (n: number) =>
        dbMock.policyholderProfile.findUnique.mockResolvedValue({
            preferences: { outboundMonthlyCeiling: n },
        } as never)

    /** Prior sent engagement rows this rolling month, as the count query sees them. */
    const priorSent = (entries: Array<{ id: string; dedupeKey: string | null }>) =>
        dbMock.notificationEvent.findMany.mockImplementation(async (args: any) =>
            args?.where?.status === "sent" ? entries : []
        )

    it("control: under the ceiling, the engagement email sends", async () => {
        ceiling(2)
        priorSent([{ id: "a", dedupeKey: "weekly:u1:2026-32" }])

        const result = await digest()

        expect(sendEmail).toHaveBeenCalledTimes(1)
        expect(result.delivered).toContain("email")
    })

    it("at the ceiling, the engagement email is skipped and the reason recorded", async () => {
        ceiling(2)
        priorSent([
            { id: "a", dedupeKey: "weekly:u1:2026-31" },
            { id: "b", dedupeKey: "weekly:u1:2026-32" },
        ])

        await digest()

        const email = rowFor("email")
        expect(email.status).toBe("skipped")
        expect(email.skipReason).toBe("user_monthly_ceiling")
        expect(rowFor("in_app").status).toBe("sent")
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it("one emission that reached two channels counts once against the ceiling", async () => {
        ceiling(2)
        // The same notification, delivered on email and push: one message to
        // the customer, two rows in the table. Counting rows would halve the
        // ceiling for anyone with push enabled.
        priorSent([
            { id: "a", dedupeKey: "drip:u1:day3" },
            { id: "b", dedupeKey: "drip:u1:day3" },
        ])

        await digest()

        expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it("never touches deadline-bearing outbound — a renewal reminder is not an engagement prompt", async () => {
        ceiling(1)
        priorSent([
            { id: "a", dedupeKey: "x1" },
            { id: "b", dedupeKey: "x2" },
            { id: "c", dedupeKey: "x3" },
        ])

        await emit({
            event: "policy_expiring",
            userId: "u1",
            title: { el: "Λήγει σύντομα", en: "Expiring soon" },
            message: { el: "Το ασφαλιστήριό σας λήγει.", en: "Your policy expires." },
        })

        expect(rowFor("email").status).toBe("sent")
        expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it("ignores a ceiling that is not a positive whole number", async () => {
        dbMock.policyholderProfile.findUnique.mockResolvedValue({
            preferences: { outboundMonthlyCeiling: "loud" },
        } as never)
        priorSent([{ id: "a", dedupeKey: "x1" }])

        await digest()

        expect(sendEmail).toHaveBeenCalledTimes(1)
    })
})
