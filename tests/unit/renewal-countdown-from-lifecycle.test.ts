import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * PW-BRIDGE-01 C-01 / C-02 — the templates count from the ONE lifecycle call.
 *
 * Two fixtures the raw column gets wrong:
 *  A. a renewed policy — the column still names the OLD period (20 days out),
 *     the renewal history names the new one (a year later). The raw window
 *     admitted it and mailed «λήγει σε 20 ημέρες» about a period that no
 *     longer applies (PARITY A4 measured exactly this on a real policy).
 *  B. an envelope five days later than the column — the count the wallet
 *     shows is 25, the templates said 20.
 * Plus the superseded sweep: an open cycle keyed on the old date for a policy
 * that never enters the 90-day scan must close as completed, not drift to
 * «overdue» and a false lapse email.
 */

const policyFindMany = vi.fn(async (..._a: any[]) => [] as any[])
const renewalFindMany = vi.fn(async (..._a: any[]) => [] as any[])
const renewalCreate = vi.fn(async (args: any) => ({ id: "renewal-new", ...args.data }))
const renewalUpdateMany = vi.fn(async (..._a: any[]) => ({ count: 0 }))
const taskCreate = vi.fn(async (args: any) => ({ id: "task-1", ...args.data }))
const userFindMany = vi.fn(async (..._a: any[]) => [{ id: "cust-1", name: "Owner", email: "o@b.gr", preferredLanguage: "el" }])

vi.mock("@/lib/db", () => ({
    db: {
        policy: { findMany: (...a: any[]) => policyFindMany(...a) },
        policyRenewal: {
            findUnique: vi.fn(async () => null),
            findMany: (...a: any[]) => renewalFindMany(...a),
            create: (args: any) => renewalCreate(args),
            update: vi.fn(async () => ({})),
            updateMany: (...a: any[]) => renewalUpdateMany(...a),
        },
        customerRelationship: { findFirst: vi.fn(async () => ({ agentUserId: "agent-1" })) },
        accessGrant: { findMany: vi.fn(async () => []) },
        userTask: { findFirst: vi.fn(async () => null), create: (args: any) => taskCreate(args) },
        notificationEvent: { findFirst: vi.fn(async () => null), count: vi.fn(async () => 0), create: vi.fn(async () => ({})) },
        notificationPreference: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) },
        user: {
            findMany: (...a: any[]) => userFindMany(...a),
            findUnique: vi.fn(async () => ({ email: "o@b.gr", preferredLanguage: "el" })),
        },
        gapInstance: { count: vi.fn(async () => 0) },
        protectionScore: { findUnique: vi.fn(() => ({ catch: (_f: any) => Promise.resolve(null) })) },
        policyholderProfile: { findUnique: vi.fn(() => ({ catch: (_f: any) => Promise.resolve(null) })) },
    },
}))
vi.mock("@/lib/notifications", () => ({ sendNotification: vi.fn(async () => {}) }))
vi.mock("@/lib/email/email-service", () => ({ sendEmail: vi.fn(async () => {}) }))
const digestTemplate = vi.fn((..._a: any[]) => ({ subject: "s", html: "h" }))
vi.mock("@/lib/email/templates/weekly-digest", () => ({ getWeeklyDigestEmail: (...a: any[]) => digestTemplate(...a) }))
vi.mock("@/lib/services/gap-engine/recommendation-generator", () => ({ getActiveRecommendations: vi.fn(async () => []) }))
// The digest reads the week's new findings through the accessor before it renders.
vi.mock("@/lib/gaps/gap-rows", () => ({ readLiveGapRows: vi.fn(async () => []), countLiveGapRowsByPolicy: vi.fn(async () => new Map()) }))
vi.mock("@/lib/subscription-entitlements", () => ({
    resolveUserEntitlements: vi.fn(async () => ({ limits: { notifications: true } })),
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { runRenewalCheck } from "@/lib/services/renewal.service"
import { runWeeklyDigestJob } from "@/lib/services/weekly-digest.service"
import { sendNotification } from "@/lib/notifications"
import { formatDate } from "@/lib/i18n/format"

// Monday 2026-07-20, 08:00 Athens: the digest runs on Mondays; the Athens day began 2026-07-19T21:00Z.
const NOW = new Date("2026-07-20T08:00:00+03:00")
const owner = { id: "cust-1", name: "Owner", email: "o@b.gr", preferredLanguage: "el" }

/** A — renewed: column 20 days out, renewal history a year later; coverageEndDate never backfilled. */
const renewed = {
    id: "pol-A",
    ownerUserId: "cust-1",
    createdByUserId: "cust-1",
    status: "active",
    policyNumber: "PA-1",
    insurerName: "Interamerican",
    lineOfBusiness: "motor",
    endDate: new Date("2026-08-09T00:00:00.000Z"),
    coverageEndDate: null,
    acordData: { renewalHistory: [{ endDate: "2027-08-09" }] },
    owner,
}
/** B — envelope 2026-08-14 (25 days), column 2026-08-09 (20 days); uploaded by the agent so the agent path runs too. */
const envelopeLater = {
    id: "pol-B",
    ownerUserId: "cust-1",
    createdByUserId: "agent-1",
    status: "active",
    policyNumber: "PB-1",
    insurerName: "Ethniki",
    lineOfBusiness: "home",
    endDate: new Date("2026-08-09T00:00:00.000Z"),
    coverageEndDate: new Date("2026-08-14T00:00:00.000Z"),
    acordData: { policy: { expirationDate: "2026-08-14" } },
    owner,
}
/** C — an open cycle keyed on the old period of a policy the 90-day scan never sees. */
const staleOpenCycle = {
    policyId: "pol-C",
    policyEndDate: new Date("2027-02-18T00:00:00.000Z"),
    policy: { coverageEndDate: new Date("2028-02-18T00:00:00.000Z") },
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    policyFindMany.mockResolvedValue([renewed, envelopeLater])
    userFindMany.mockResolvedValue([owner])
    // The superseded sweep asks for open cycles (status in [...]); the overdue sweep asks for pending ones.
    renewalFindMany.mockImplementation(async (args: any) => (args?.where?.status?.in ? [staleOpenCycle] : []))
})
afterEach(() => {
    vi.useRealTimers()
})

describe("the renewal cron counts from the lifecycle (C-02)", () => {
    it("skips the renewed policy, keys the cycle on the envelope date and quotes it everywhere", async () => {
        const summary = await runRenewalCheck()

        expect(summary.policiesScanned).toBe(2)
        // A is admitted by the raw arm (column 20 days out) and rejected by the lifecycle (a year out).
        const created = renewalCreate.mock.calls.map((c) => c[0].data)
        expect(created).toHaveLength(1)
        expect(created[0].policyId).toBe("pol-B")
        expect(created[0].policyEndDate.toISOString()).toMatch(/^2026-08-14/)
        expect(created[0].daysBeforeExpiry).toBe(25)
        expect(created.some((d) => d.policyId === "pol-A")).toBe(false)

        // The close-out runs for B's own earlier-keyed cycles before the upsert.
        expect(renewalUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ policyId: "pol-B", policyEndDate: { lt: expect.any(Date) }, status: { in: ["pending", "overdue"] } }),
                data: expect.objectContaining({ status: "completed", outcome: "renewed_same_insurer" }),
            })
        )
        const closeB = renewalUpdateMany.mock.calls.find((c) => c[0].where.policyId === "pol-B")![0]
        expect(closeB.where.policyEndDate.lt.toISOString()).toMatch(/^2026-08-14/)

        // The renewed policy earns no reminder this run, but the loop still closes
        // the stale cycle keyed on its old period — before the milestone decision,
        // since its resolved column may not be backfilled yet for the sweep.
        const closeA = renewalUpdateMany.mock.calls.find((c) => c[0].where.policyId === "pol-A")
        expect(closeA, "the renewed policy's stale cycle must close inside the loop").toBeTruthy()
        expect(closeA![0].where.policyEndDate.lt.toISOString()).toMatch(/^2027-08-09/)

        // The policyholder reminder quotes the resolved date, never the column's.
        const reminder = vi.mocked(sendNotification).mock.calls.map((c) => c[0]).find((n: any) => n.userId === "cust-1")
        expect(reminder).toBeTruthy()
        const resolvedEl = formatDate(new Date("2026-08-14T00:00:00.000Z"), "el")
        const columnEl = formatDate(new Date("2026-08-09T00:00:00.000Z"), "el")
        expect((reminder as any).message.el).toContain(resolvedEl)
        expect((reminder as any).message.el).not.toContain(columnEl)
        expect(summary.policyholderNotificationsSent).toBe(1)

        // The agent's task is due seven days before the RESOLVED end.
        expect(taskCreate).toHaveBeenCalledTimes(1)
        expect(taskCreate.mock.calls[0][0].data.dueDate.toISOString()).toMatch(/^2026-08-07/)
    })

    it("closes an open cycle keyed on a superseded period even when the policy is outside the scan", async () => {
        await runRenewalCheck()
        const closeC = renewalUpdateMany.mock.calls.find((c) => c[0].where.policyId === "pol-C")
        expect(closeC, "the superseded sweep must reach pol-C").toBeTruthy()
        expect(closeC![0].where.policyEndDate.lt.toISOString()).toMatch(/^2028-02-18/)
        expect(closeC![0].data.status).toBe("completed")
    })
})

describe("the weekly digest counts from the lifecycle (C-01)", () => {
    it("drops the renewed policy and counts the envelope-dated one at 25 days, not the column's 20", async () => {
        await runWeeklyDigestJob()
        expect(digestTemplate).toHaveBeenCalled()
        const data = digestTemplate.mock.calls[0][2]
        expect(data.renewingSoon).toEqual([{ insurerName: "Ethniki", lineOfBusiness: "home", daysUntilExpiry: 25 }])
    })
})
