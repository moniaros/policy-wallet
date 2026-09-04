import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"

import { globSync } from "../helpers/glob"

/**
 * The recommendation tie-break reads what the customer said matters — and it
 * reads it LIVE, from the facts and statements through the one rule table
 * (`deriveProtectionPriorities`), never from `protection_profiles.priorityAreas`.
 * That column is the analytics snapshot taken when the onboarding completed;
 * until Sept 2026 `getActiveRecommendations` ordered against it, so an
 * assessment answer given a month later redrew the map on the page while the
 * recommendations still followed the old one.
 */

const dbMock = vi.hoisted(() => ({
    policyholderProfile: { findUnique: vi.fn() },
    protectionProfile: { findUnique: vi.fn() },
    recommendationInstance: { findMany: vi.fn() },
}))
vi.mock("@/lib/db", () => ({ db: dbMock }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { getActiveRecommendations, statedPriorityIds } from "@/lib/services/gap-engine"
import { getActiveRecommendations as readActiveRecommendations } from "@/lib/services/gap-engine/recommendation-generator"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { deriveProtectionPriorities } from "@/lib/services/protection-profile/derive-priorities"

const FAMILY = {
    childrenCount: 1,
    dependentsCount: 2,
    employmentStatus: "employed",
    vehiclesCount: 1,
    answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "vehiclesCount"],
}

const rec = (id: string, lineOfBusiness: string, urgency = "high") => ({
    id,
    lineOfBusiness,
    ruleId: `rule:${lineOfBusiness}`,
    title: { en: id, el: id },
    description: { en: "", el: "" },
    urgency,
    estimatedCostEur: null,
    personalReason: { en: "", el: "" },
    status: "active",
    createdAt: new Date("2026-09-01"),
    product: null,
    gapInstance: null,
})

beforeEach(() => {
    for (const table of Object.values(dbMock)) for (const fn of Object.values(table)) fn.mockReset()
    dbMock.recommendationInstance.findMany.mockResolvedValue([])
})

describe("statedPriorityIds — derived from the rule table, gated on completion", () => {
    it("is null until the onboarding completed — statements nobody finished are not a stated priority", () => {
        const ctx = toLifeContext(FAMILY as any)
        expect(statedPriorityIds(ctx, null)).toBeNull()
        expect(statedPriorityIds(ctx, { completedAt: null, riskConcerns: ["family"] })).toBeNull()
    })

    it("is exactly the high and medium rows of deriveProtectionPriorities, in the map's order", () => {
        const ctx = toLifeContext(FAMILY as any)
        const statements = { completedAt: new Date("2026-09-01"), riskConcerns: ["vehicle", "family"] }
        const expected = deriveProtectionPriorities(ctx, statements)
            .filter((p) => p.importance === "high" || p.importance === "medium")
            .map((p) => p.id)
        expect(expected.length).toBeGreaterThan(1)
        expect(statedPriorityIds(ctx, statements)).toEqual(expected)
        expect(statedPriorityIds(ctx, statements)?.[0]).toBe("mobility")
    })

    it("follows the facts, not a snapshot: a new answer redraws the list", () => {
        const statements = { completedAt: new Date("2026-09-01"), riskConcerns: [] as string[] }
        const before = statedPriorityIds(toLifeContext({ answeredFields: [] } as any), statements) ?? []
        const after = statedPriorityIds(toLifeContext(FAMILY as any), statements) ?? []
        expect(before).not.toContain("household")
        expect(after).toContain("household")
    })
})

describe("getActiveRecommendations orders by the LIVE list", () => {
    it("the index entry loads the facts and statements, derives the list, and hands it to the row read — priorityAreas is never selected", async () => {
        dbMock.policyholderProfile.findUnique.mockResolvedValue({ ...FAMILY })
        dbMock.protectionProfile.findUnique.mockResolvedValue({ completedAt: new Date("2026-09-01"), riskConcerns: ["family"], commitments: [], recentChanges: [], futureConsiderations: [], unsureSteps: [] })
        // Same urgency, same protection weight (life 25 = health 25): only the stated priority separates them.
        dbMock.recommendationInstance.findMany.mockResolvedValue([rec("h", "health"), rec("l", "life")])

        const out = await getActiveRecommendations("u1")

        expect(out.map((r) => r.lineOfBusiness)).toEqual(["life", "health"])
        const selects = dbMock.protectionProfile.findUnique.mock.calls.map((c) => c[0].select ?? {})
        expect(selects.length).toBeGreaterThan(0)
        for (const select of selects) expect(Object.keys(select)).not.toContain("priorityAreas")
    })

    it("the raw row read takes the list as an argument and reads no profile at all", async () => {
        dbMock.recommendationInstance.findMany.mockResolvedValue([rec("h", "health"), rec("l", "life")])
        const plain = await readActiveRecommendations("u1")
        expect(plain.map((r) => r.lineOfBusiness)).toEqual(["health", "life"])
        const stated = await readActiveRecommendations("u1", ["household"])
        expect(stated.map((r) => r.lineOfBusiness)).toEqual(["life", "health"])
        expect(dbMock.protectionProfile.findUnique).not.toHaveBeenCalled()
        expect(dbMock.policyholderProfile.findUnique).not.toHaveBeenCalled()
    })
})

describe("priorityAreas is analytics-only — by construction", () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")

    it("no read path under lib/ or app/ selects it; the writer and the GDPR export are the only mentions", () => {
        const files = [...globSync("lib/**/*.ts"), ...globSync("app/**/*.ts"), ...globSync("app/**/*.tsx")].filter((f) => !/\.test\./.test(f))
        const mentions = files.filter((f) => /\bpriorityAreas\b/.test(strip(readFileSync(f, "utf-8"))))
        expect(mentions.sort()).toEqual(["app/onboarding/protection-profile-actions.ts", "lib/services/compliance.service.ts"].sort())
        expect(strip(readFileSync("lib/services/gap-engine/recommendation-generator.ts", "utf-8"))).not.toMatch(/priorityAreas/)
    })
})
