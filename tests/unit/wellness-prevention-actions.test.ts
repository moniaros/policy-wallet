import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth-helpers", () => ({ getAuthenticatedUser: vi.fn(async () => ({ dbUser: { id: "u1", roles: "policyholder" } })) }))
vi.mock("@/lib/policy-access", () => ({ getPolicyAccess: vi.fn() }))
vi.mock("@/lib/notifications/dispatch", () => ({ emit: vi.fn(async () => ({})) }))
vi.mock("@/lib/services/collaboration.service", () => ({ collaborationService: { ensureAutomationThread: vi.fn(async () => ({ id: "t1" })) } }))
vi.mock("@/lib/db", () => ({
    db: {
        healthBenefitUsage: { upsert: vi.fn(async () => ({})), findMany: vi.fn(), update: vi.fn(async () => ({})) },
        userNotificationSettings: { upsert: vi.fn(async () => ({})), findMany: vi.fn() },
        customerRelationship: { findFirst: vi.fn() },
        healthRiskAssessment: { findFirst: vi.fn() },
        policyholderProfile: { findUnique: vi.fn() },
        healthShare: { upsert: vi.fn(async () => ({ id: "s1", updatedAt: new Date("2026-09-24T10:00:00Z") })), updateMany: vi.fn(async () => ({ count: 1 })) },
        policy: { findFirst: vi.fn(async () => ({ insurerName: "Εθνική", policyNumber: "P-9" })) },
    },
}))

import { db } from "@/lib/db"
import { getPolicyAccess } from "@/lib/policy-access"
import { emit } from "@/lib/notifications/dispatch"
import { setCheckupIntent, setDailyNudgeOptIn } from "@/app/(protected)/wellness/actions"
import { revokeHealthShare, shareHealthWithAdvisor } from "@/app/(protected)/wellness/share-actions"
import { runCheckupReminderScan } from "@/lib/services/checkup-reminder.service"
import { runDailyNudge } from "@/lib/services/daily-nudge.service"
import { reminderWindow } from "@/lib/wellness/checkup-benefit"

beforeEach(() => vi.clearAllMocks())

describe("setCheckupIntent — the owner's own choice (brief P1)", () => {
    it("refuses a policy the caller does not OWN (family member / advisor included)", async () => {
        vi.mocked(getPolicyAccess).mockResolvedValue({ exists: true, isOwner: false, canRead: true } as any)
        expect(await setCheckupIntent({ policyId: "p1", choice: "done" })).toEqual({ error: "NOT_FOUND" })
        expect(db.healthBenefitUsage.upsert).not.toHaveBeenCalled()
    })
    it("«done» maps to completed and asks for nothing medical", async () => {
        vi.mocked(getPolicyAccess).mockResolvedValue({ exists: true, isOwner: true } as any)
        await setCheckupIntent({ policyId: "p1", choice: "done" })
        const arg = vi.mocked(db.healthBenefitUsage.upsert).mock.calls[0][0] as any
        expect(arg.update).toMatchObject({ status: "completed", intent: null, remindAt: null })
        expect(Object.keys(arg.update)).not.toContain("note")
    })
    it("«later» needs a date inside tomorrow … one year, and resets remindedAt", async () => {
        vi.mocked(getPolicyAccess).mockResolvedValue({ exists: true, isOwner: true } as any)
        const w = reminderWindow()
        expect(await setCheckupIntent({ policyId: "p1", choice: "later" })).toEqual({ error: "INVALID_DATE" })
        expect(await setCheckupIntent({ policyId: "p1", choice: "later", remindAt: "2000-01-01" })).toEqual({ error: "INVALID_DATE" })
        await setCheckupIntent({ policyId: "p1", choice: "later", remindAt: w.min })
        const arg = vi.mocked(db.healthBenefitUsage.upsert).mock.calls[0][0] as any
        expect(arg.update.intent).toBe("later")
        expect(arg.update.remindedAt).toBeNull()
        expect(arg.update.remindAt.toISOString().slice(0, 10)).toBe(w.min)
    })
})

describe("daily nudge opt-in and job", () => {
    it("opt-in writes the person's own settings row", async () => {
        await setDailyNudgeOptIn(true)
        expect(vi.mocked(db.userNotificationSettings.upsert).mock.calls[0][0]).toMatchObject({ where: { userId: "u1" }, update: { dailyNudgeOptIn: true } })
    })
    it("the job asks only for opted-in users and sends one per Athens day", async () => {
        vi.mocked(db.userNotificationSettings.findMany).mockResolvedValue([{ userId: "a" }, { userId: "b" }] as any)
        const r = await runDailyNudge(new Date("2026-09-24T07:00:00Z"))
        expect(vi.mocked(db.userNotificationSettings.findMany).mock.calls[0][0]).toMatchObject({ where: { dailyNudgeOptIn: true } })
        expect(r.sent).toBe(2)
        const keys = vi.mocked(emit).mock.calls.map((c) => (c[0] as any).dedupeKey)
        expect(keys).toEqual(["daily_nudge:2026-09-24", "daily_nudge:2026-09-24"])
        expect(vi.mocked(emit).mock.calls.every((c) => (c[0] as any).event === "daily_nudge")).toBe(true)
    })
})

describe("check-up reminder scan — only what the person asked for", () => {
    it("queries arrived, unsent, not-done, not-«not relevant» rows; sends once and stamps", async () => {
        vi.mocked(db.healthBenefitUsage.findMany).mockResolvedValue([{ id: "r1", userId: "u1", policyKey: "p1", remindAt: new Date("2026-09-24T00:00:00Z") }] as any)
        const r = await runCheckupReminderScan(new Date("2026-09-24T06:00:00Z"))
        const where = (vi.mocked(db.healthBenefitUsage.findMany).mock.calls[0][0] as any).where
        expect(where).toMatchObject({ benefit: "annual_checkup", remindedAt: null, status: { not: "completed" } })
        expect(where.OR).toEqual([{ intent: null }, { intent: { not: "not_relevant" } }])
        expect(r.reminded).toBe(1)
        expect((vi.mocked(emit).mock.calls[0][0] as any).dedupeKey).toBe("benefit_reminder:r1:2026-09-24")
        expect((vi.mocked(emit).mock.calls[0][0] as any).relatedObjectType).toBeUndefined() // never mirrored to family
        expect(vi.mocked(db.healthBenefitUsage.update).mock.calls[0][0]).toMatchObject({ where: { id: "r1" } })
    })
})

describe("health share — consent, own living relationship, no values in the channel", () => {
    it("without consent nothing is read", async () => {
        expect(await shareHealthWithAdvisor({ relationshipId: "rel", scope: "both", consent: false })).toEqual({ error: "CONSENT_REQUIRED" })
        expect(db.customerRelationship.findFirst).not.toHaveBeenCalled()
    })
    it("only the caller's own, not-ended relationship", async () => {
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue(null)
        expect(await shareHealthWithAdvisor({ relationshipId: "rel", scope: "assessment", consent: true })).toEqual({ error: "NOT_FOUND" })
        const where = (vi.mocked(db.customerRelationship.findFirst).mock.calls[0][0] as any).where
        expect(where).toMatchObject({ id: "rel", policyholderUserId: "u1" })
        expect(where.status.notIn).toEqual(["inactive", "terminated"])
    })
    it("writes a minimised snapshot; the notification carries no health value", async () => {
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ id: "rel", agentUserId: "ag" } as any)
        vi.mocked(db.healthRiskAssessment.findFirst).mockResolvedValue({ createdAt: new Date("2026-09-20"), scores: [{ category: "metabolic", score: 55, band: "elevated", checks: ["glucose"] }] } as any)
        expect(await shareHealthWithAdvisor({ relationshipId: "rel", scope: "assessment", consent: true })).toEqual({ ok: true })
        const snap = (vi.mocked(db.healthShare.upsert).mock.calls[0][0] as any).create.snapshot
        expect(JSON.stringify(snap)).not.toMatch(/glucose|checks/)
        const note = vi.mocked(emit).mock.calls[0][0] as any
        expect(note.event).toBe("health_share_received")
        expect(note.userId).toBe("ag")
        expect(JSON.stringify(note)).not.toMatch(/55|elevated|metabolic/)
    })
    it("revoke is scoped to the caller's own active share and empties the snapshot", async () => {
        await revokeHealthShare("s1")
        const arg = vi.mocked(db.healthShare.updateMany).mock.calls[0][0] as any
        expect(arg.where).toEqual({ id: "s1", userId: "u1", status: "active" })
        expect(arg.data.status).toBe("revoked")
        expect(String(arg.data.snapshot)).toMatch(/DbNull/)
    })
})
