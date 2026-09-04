import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"

/**
 * `answerAssessmentFactor` — the write path of the area detail
 * (app/(protected)/protection/assessment-actions.ts).
 *
 * Prisma and auth are stubbed; `applyFactWrites` runs for real, so the
 * provenance the action stamps is the rule's own output, not a re-statement.
 */

const { state, db, refreshProtectionScore, revalidatePath, loadAttentionAreas, recordConversionEvent } = vi.hoisted(() => {
    const state: { profile: Record<string, unknown> | null } = { profile: null }
    const db = {
        policyholderProfile: {
            findUnique: vi.fn(async () => state.profile),
            upsert: vi.fn(async (args: any) => {
                state.profile = state.profile ? { ...state.profile, ...args.update } : { ...args.create }
                return state.profile
            }),
        },
    }
    return {
        state,
        db,
        refreshProtectionScore: vi.fn(async () => ({})),
        revalidatePath: vi.fn(),
        recordConversionEvent: vi.fn(async () => undefined),
        loadAttentionAreas: vi.fn(async () => ({
            areas: [
                {
                    area: "household",
                    activated: true,
                    unknownFactors: ["dependents", "income"],
                    refinableFactors: [],
                    // The area's own risk still wants the facts — the question filter reads the exposure.
                    exposure: { risks: [{ id: "life_dependents", status: "needs_review", name: "", missingFactors: ["dependents"] }] },
                    protection: { lines: [], gaps: [], hasAnalysed: false },
                    explanation: { why: "", unknown: "", next: "", nextStep: "answer_questions", density: "collapsed" },
                },
                {
                    area: "health",
                    activated: true,
                    unknownFactors: ["health"],
                    refinableFactors: [],
                    exposure: { risks: [{ id: "chronic_condition_costs", status: "needs_review", name: "", missingFactors: ["health"] }] },
                    protection: { lines: [], gaps: [], hasAnalysed: false },
                },
            ],
            ctx: { known: { dependents: false, income: false, health: false }, incomeDependency: "primary" },
            provenance: {},
            needs: { uncertaintyReasons: [] },
        })),
    }
})
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/journey/conversion-events", () => ({ recordConversionEvent }))
vi.mock("@/lib/auth-helpers", () => ({
    getAuthenticatedUser: vi.fn(async () => ({ dbUser: { id: "user-1", preferredLanguage: "el" } })),
}))
vi.mock("@/lib/services/gap-engine", () => ({ refreshProtectionScore }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/protection/load-attention-areas", () => ({ loadAttentionAreas }))

import { answerAssessmentFactor } from "@/app/(protected)/protection/assessment-actions"

beforeEach(() => {
    state.profile = null
    vi.clearAllMocks()
})

const lastUpsert = () => db.policyholderProfile.upsert.mock.calls.at(-1)![0] as any

describe("answerAssessmentFactor — the contract", () => {
    it("writes the answer through applyFactWrites: source assessment, precision exact, column answered", async () => {
        const res = await answerAssessmentFactor({ area: "household", factor: "dependents", value: 2 })
        expect(res).toEqual({ ok: true, next: "dependents", remainingUnknown: 2, skipped: [] })
        // Two deciding facts still missing: no completion is mirrored.
        expect(recordConversionEvent).not.toHaveBeenCalled()
        const { create } = lastUpsert()
        expect(create.userId).toBe("user-1")
        expect(create.dependentsCount).toBe(2)
        expect(create.answeredFields).toEqual(["dependentsCount"])
        expect(create.factProvenance.dependentsCount).toMatchObject({ source: "assessment", precision: "exact" })
        expect(refreshProtectionScore).toHaveBeenCalledWith("user-1", "profile_update")
        expect(revalidatePath).toHaveBeenCalledWith("/protection")
        expect(revalidatePath).toHaveBeenCalledWith("/protection/areas/household")
        expect(loadAttentionAreas).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", language: "el" }))
    })

    it("an exact answer replaces a coarse floor; a floor can never be re-written over it by this path", async () => {
        state.profile = {
            dependentsCount: 1,
            answeredFields: ["dependentsCount"],
            factProvenance: { dependentsCount: { source: "onboarding", precision: "coarse", at: "2026-09-01T00:00:00.000Z" } },
        }
        const res = await answerAssessmentFactor({ area: "household", factor: "dependents", value: 3 })
        expect(res.ok).toBe(true)
        expect(lastUpsert().update.dependentsCount).toBe(3)
        expect(lastUpsert().update.factProvenance.dependentsCount.precision).toBe("exact")
    })

    it("a year of birth is a bucket: written coarse, so a full date the wizard holds is never overwritten", async () => {
        state.profile = {
            dateOfBirth: new Date("1985-05-05T00:00:00Z"),
            answeredFields: ["dateOfBirth"],
            factProvenance: { dateOfBirth: { source: "questionnaire", precision: "exact", at: "2026-09-01T00:00:00.000Z" } },
        }
        const res = await answerAssessmentFactor({ area: "household", factor: "age", value: 1990 })
        expect(res.ok).toBe(true)
        expect((res as any).skipped).toEqual([{ column: "dateOfBirth", reason: "coarse_over_exact" }])
        expect(lastUpsert().update.dateOfBirth).toBeUndefined()

        state.profile = null
        await answerAssessmentFactor({ area: "household", factor: "age", value: 1990 })
        expect(lastUpsert().create.dateOfBirth.toISOString()).toBe("1990-07-01T00:00:00.000Z")
        expect(lastUpsert().create.factProvenance.dateOfBirth.precision).toBe("coarse")
    })

    it("«none» on a multi is an empty list — a real no, recorded as answered, never an erasure by omission", async () => {
        const res = await answerAssessmentFactor({ area: "lifestyle", factor: "hobbies", value: ["none"] })
        expect(res.ok).toBe(true)
        expect(lastUpsert().create.activities).toEqual([])
        expect(lastUpsert().create.answeredFields).toEqual(["activities"])
    })

    it("loans writes the amount and the flag together", async () => {
        await answerAssessmentFactor({ area: "debt", factor: "loans", value: 12000.4 })
        expect(lastUpsert().create).toMatchObject({ loanAmount: 12000, hasLoans: true })
        await answerAssessmentFactor({ area: "debt", factor: "loans", value: 0 })
        expect(lastUpsert().update).toMatchObject({ loanAmount: 0, hasLoans: false })
    })
})

describe("answerAssessmentFactor — the server mirror of an area's completion (P3)", () => {
    /** After the write the area has no deciding fact left; one other activated area still does. */
    function settled() {
        loadAttentionAreas.mockResolvedValueOnce({
            areas: [
                { area: "household", activated: true, unknownFactors: [], refinableFactors: [], exposure: { risks: [] }, protection: { lines: [], gaps: [], hasAnalysed: false } },
                { area: "health", activated: true, unknownFactors: ["health"], refinableFactors: [], exposure: { risks: [] }, protection: { lines: [], gaps: [], hasAnalysed: false } },
                { area: "mobility", activated: false, unknownFactors: [], refinableFactors: [], exposure: { risks: [] }, protection: { lines: [], gaps: [], hasAnalysed: false } },
            ],
            ctx: { known: { dependents: true, income: true, health: false }, incomeDependency: "primary" },
            provenance: {},
            needs: { uncertaintyReasons: [] },
        } as any)
    }

    it("records risk_assessment_completed when this answer takes the area's deciding facts to zero", async () => {
        settled()
        const res = await answerAssessmentFactor({ area: "household", factor: "dependents", value: 2 })
        expect(res).toMatchObject({ ok: true, remainingUnknown: 0 })
        expect(recordConversionEvent).toHaveBeenCalledTimes(1)
        expect(recordConversionEvent).toHaveBeenCalledWith("user-1", "risk_assessment_completed", {
            source: "protection_area:household",
            // Activated areas only: household settled, health still waiting; dormant mobility is not counted.
            areas_completed: 1,
            remaining_unknown: 1,
        })
    })

    it("does not record a completion for a refining answer on an area that was already settled", async () => {
        state.profile = {
            dependentsCount: 1,
            answeredFields: ["dependentsCount"],
            factProvenance: { dependentsCount: { source: "onboarding", precision: "coarse", at: "2026-09-01T00:00:00.000Z" } },
        }
        settled()
        const res = await answerAssessmentFactor({ area: "household", factor: "dependents", value: 3 })
        expect(res).toMatchObject({ ok: true, remainingUnknown: 0 })
        expect(recordConversionEvent).not.toHaveBeenCalled()
    })

    it("does not record a completion for income dependency, which is not a catalogue factor", async () => {
        settled()
        await answerAssessmentFactor({ area: "household", factor: "incomeDependency", value: "primary" })
        expect(recordConversionEvent).not.toHaveBeenCalled()
    })
})

describe("answerAssessmentFactor — validation, before any read", () => {
    it.each([
        ["an unknown factor", { area: "household", factor: "shoeSize", value: 42 }],
        ["an unknown area", { area: "garden", factor: "dependents", value: 1 }],
        ["a single with a value outside its options", { area: "household", factor: "maritalStatus", value: "complicated" }],
        ["a number given as text", { area: "household", factor: "dependents", value: "2" }],
        ["a negative amount", { area: "household", factor: "income", value: -1 }],
        ["a count beyond reason", { area: "household", factor: "children", value: 999 }],
        ["a multi with an unlisted id", { area: "lifestyle", factor: "hobbies", value: ["skydiving"] }],
        ["a boolean given as a string", { area: "lifestyle", factor: "pets", value: "yes" }],
        ["a birth year in the future", { area: "household", factor: "age", value: 2999 }],
        ["no body at all", undefined],
    ])("rejects %s with INVALID_INPUT and touches nothing", async (_label, input) => {
        const res = await answerAssessmentFactor(input)
        expect(res).toEqual({ ok: false, error: "INVALID_INPUT" })
        expect(db.policyholderProfile.findUnique).not.toHaveBeenCalled()
        expect(db.policyholderProfile.upsert).not.toHaveBeenCalled()
        expect(refreshProtectionScore).not.toHaveBeenCalled()
    })

    it("refuses a factor the area's risks do not need", async () => {
        const res = await answerAssessmentFactor({ area: "mobility", factor: "dependents", value: 1 })
        expect(res).toEqual({ ok: false, error: "NOT_IN_AREA" })
        expect(db.policyholderProfile.upsert).not.toHaveBeenCalled()
    })
})

describe("answerAssessmentFactor — the Art. 9 gate", () => {
    it("refuses the health factor without the explicit consent flag, before reading the profile", async () => {
        const res = await answerAssessmentFactor({ area: "health", factor: "health", value: ["diabetes"] })
        expect(res).toEqual({ ok: false, error: "CONSENT_REQUIRED" })
        expect(db.policyholderProfile.findUnique).not.toHaveBeenCalled()
        expect(db.policyholderProfile.upsert).not.toHaveBeenCalled()
    })

    it("refuses a truthy-but-not-true flag", async () => {
        const res = await answerAssessmentFactor({ area: "health", factor: "health", value: ["diabetes"], healthConsent: "yes" })
        expect(res).toEqual({ ok: false, error: "INVALID_INPUT" })
        expect(db.policyholderProfile.upsert).not.toHaveBeenCalled()
    })

    it("refuses the health factor outside the health area even with consent", async () => {
        const res = await answerAssessmentFactor({ area: "household", factor: "health", value: ["diabetes"], healthConsent: true })
        expect(res).toEqual({ ok: false, error: "NOT_IN_AREA" })
    })

    it("writes it with consent, inside its area, as the person's own exact statement", async () => {
        const res = await answerAssessmentFactor({ area: "health", factor: "health", value: ["diabetes", "asthma"], healthConsent: true })
        expect(res.ok).toBe(true)
        expect(lastUpsert().create.chronicConditions).toEqual(["diabetes", "asthma"])
        expect(lastUpsert().create.factProvenance.chronicConditions).toMatchObject({ source: "assessment", precision: "exact" })
        expect(revalidatePath).toHaveBeenCalledWith("/protection/areas/health")
    })
})

describe("answerAssessmentFactor — the endpoint's shape (source)", () => {
    const SRC = readFileSync("app/(protected)/protection/assessment-actions.ts", "utf-8")

    it("is a server action whose subject is the session: no user id parameter, auth first", () => {
        expect(SRC).toMatch(/^\s*"use server"/m)
        expect(SRC).toMatch(/export async function answerAssessmentFactor\(input: unknown\)/)
        expect(SRC).not.toMatch(/answerAssessmentFactor\([^)]*userId/)
        const auth = SRC.indexOf("await getAuthenticatedUser()")
        const read = SRC.search(/\bdb\.\w+\.\w+\(/)
        expect(auth).toBeGreaterThan(-1)
        expect(read).toBeGreaterThan(-1)
        expect(auth).toBeLessThan(read)
    })

    it("writes only through applyFactWrites and runs the same engine refresh the quick start runs", () => {
        expect(SRC).toContain("applyFactWrites(")
        expect(SRC).toContain('refreshProtectionScore(dbUser.id, "profile_update")')
        expect(SRC).not.toMatch(/db\.policyholderProfile\.update\(/)
    })
})
