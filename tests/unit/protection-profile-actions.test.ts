import { beforeEach, describe, expect, it, vi } from "vitest"

const { state, tx, db, refreshProtectionScore, declareLifeEvent, recordConversionEvent } = vi.hoisted(() => {
    const state: { profile: Record<string, unknown> | null; row: Record<string, unknown> | null } = { profile: null, row: null }
    const tx = {
        policyholderProfile: {
            findUnique: vi.fn(async () => state.profile),
            upsert: vi.fn(async (args: any) => {
                state.profile = state.profile ? { ...state.profile, ...args.update } : { ...args.create }
                return state.profile
            }),
        },
        protectionProfile: {
            findUnique: vi.fn(async () => state.row),
            upsert: vi.fn(async (args: any) => {
                state.row = state.row ? { ...state.row, ...args.update } : { ...args.create }
                return state.row
            }),
        },
    }
    const db = {
        $transaction: vi.fn(async (cb: any) => cb(tx)),
        policyholderProfile: { findUnique: vi.fn(async () => state.profile), upsert: vi.fn(async () => ({})) },
        protectionProfile: {
            findUnique: vi.fn(async () => state.row),
            update: vi.fn(async (args: any) => { state.row = { ...(state.row ?? {}), ...args.data }; return state.row }),
            upsert: vi.fn(async (args: any) => { state.row = state.row ? { ...state.row, ...args.update } : { ...args.create }; return state.row }),
            updateMany: vi.fn(async () => ({ count: 1 })),
        },
        policy: { count: vi.fn(async () => 1) },
    }
    return {
        state,
        tx,
        db,
        refreshProtectionScore: vi.fn(async () => ({})),
        declareLifeEvent: vi.fn(async () => ({ ok: true, backfilled: [], skipped: [], profileChanged: false })),
        recordConversionEvent: vi.fn(async () => {}),
    }
})
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/auth-helpers", () => ({
    getAuthenticatedUser: vi.fn(async () => ({ dbUser: { id: "user-1", name: "Μαρία", aiProcessingConsentVersion: null, preferredLanguage: "el" } })),
}))
vi.mock("@/lib/services/gap-engine", () => ({ refreshProtectionScore }))
// The engine work runs after the response; the test drains it explicitly.
const afterQueue = vi.hoisted(() => ({ pending: [] as Promise<unknown>[] }))
vi.mock("next/server", () => ({ after: (fn: () => unknown) => { afterQueue.pending.push(Promise.resolve().then(fn)) } }))
const flushAfter = async () => { await Promise.all(afterQueue.pending.splice(0)) }
vi.mock("@/lib/services/life-events/service", () => ({ declareLifeEvent }))
vi.mock("@/lib/journey/conversion-events", () => ({ recordConversionEvent }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { completeProtectionProfile, saveProtectionProfileStep, skipProtectionProfile } from "@/app/onboarding/protection-profile-actions"

beforeEach(() => {
    state.profile = null
    state.row = null
    vi.clearAllMocks()
})

describe("saveProtectionProfileStep", () => {
    it("writes the facts as KNOWN columns, keeps the answer, and names the next screen", async () => {
        const res = await saveProtectionProfileStep({ step: "people", people: ["children", "partner"], childrenCount: "2" })
        expect(res).toEqual({ ok: true, next: "home", answeredSteps: ["people"] })
        const upsert = tx.policyholderProfile.upsert.mock.calls[0]![0]
        expect(upsert.create).toMatchObject({ userId: "user-1", childrenCount: 2, dependentsCount: 3, answeredFields: ["childrenCount", "dependentsCount"] })
        // Who said so, and how precisely: two children is the figure; «+ my
        // partner» makes the dependant count a floor.
        expect(upsert.create.factProvenance.childrenCount).toMatchObject({ source: "onboarding", precision: "exact" })
        expect(upsert.create.factProvenance.dependentsCount).toMatchObject({ source: "onboarding", precision: "coarse" })
        expect(state.row).toMatchObject({ answers: { people: { people: ["children", "partner"], childrenCount: "2" } }, answeredSteps: ["people"], unsureSteps: [] })
    })

    it("a floor from these screens never replaces a figure the wizard recorded", async () => {
        // «My partner and my children (three or more)» → childrenCount 3 and
        // dependentsCount 4 are BOUNDS. The wizard said 3 and 4 exactly; the
        // bounds lose, the provenance stays the wizard's, nothing is rewritten.
        const wizard = { source: "assessment", precision: "exact", at: "2026-08-01T00:00:00.000Z" }
        state.profile = {
            childrenCount: 3,
            dependentsCount: 4,
            answeredFields: ["childrenCount", "dependentsCount"],
            factProvenance: { childrenCount: wizard, dependentsCount: wizard },
        }
        await saveProtectionProfileStep({ step: "people", people: ["partner", "children"], childrenCount: "3" })
        const upsert = tx.policyholderProfile.upsert.mock.calls[0]![0]
        expect(upsert.update).toEqual({
            answeredFields: ["childrenCount", "dependentsCount"],
            factProvenance: { childrenCount: wizard, dependentsCount: wizard },
        })
    })

    it("a value the person chose outright replaces an older figure — and records who said so", async () => {
        // The same row, but the person now says «only my two children». Exact
        // over exact: the newer statement wins, and the ledger says onboarding.
        const wizard = { source: "assessment", precision: "exact", at: "2026-08-01T00:00:00.000Z" }
        state.profile = {
            childrenCount: 3,
            dependentsCount: 4,
            answeredFields: ["childrenCount", "dependentsCount"],
            factProvenance: { childrenCount: wizard, dependentsCount: wizard },
        }
        await saveProtectionProfileStep({ step: "people", people: ["children"], childrenCount: "2" })
        const upsert = tx.policyholderProfile.upsert.mock.calls[0]![0]
        expect(upsert.update).toMatchObject({ childrenCount: 2, dependentsCount: 2 })
        expect(upsert.update.factProvenance.childrenCount).toMatchObject({ source: "onboarding", precision: "exact" })
        expect(upsert.update.factProvenance.dependentsCount).toMatchObject({ source: "onboarding", precision: "exact" })
    })

    it("a row written before provenance existed keeps its answers against a floor", async () => {
        // No factProvenance at all — the wizard as it wrote for a year. An
        // answered column is a declared exact value, so the floor still loses.
        state.profile = { childrenCount: 3, dependentsCount: 4, answeredFields: ["childrenCount", "dependentsCount"] }
        await saveProtectionProfileStep({ step: "people", people: ["partner", "children"], childrenCount: "3" })
        const upsert = tx.policyholderProfile.upsert.mock.calls[0]![0]
        expect(upsert.update).toEqual({ answeredFields: ["childrenCount", "dependentsCount"], factProvenance: {} })
    })

    it("«δεν είμαι σίγουρος/η» touches no fact column and marks the step", async () => {
        const res = await saveProtectionProfileStep({ step: "obligations", unsure: true })
        expect(res.ok).toBe(true)
        expect(tx.policyholderProfile.upsert).not.toHaveBeenCalled()
        expect(state.row).toMatchObject({ unsureSteps: ["obligations"], answeredSteps: ["obligations"] })
    })

    it("a statement goes to the profile row, not to a fact column", async () => {
        await saveProtectionProfileStep({ step: "hurt_most", concerns: ["income", "family"] })
        expect(tx.policyholderProfile.upsert).not.toHaveBeenCalled()
        expect(state.row).toMatchObject({ riskConcerns: ["income", "family"] })
    })

    it("rejects an invalid payload without touching the database", async () => {
        const res = await saveProtectionProfileStep({ step: "intent", intent: "free text" })
        expect(res).toEqual({ ok: false, error: "validation" })
        expect(db.$transaction).not.toHaveBeenCalled()
    })
})

describe("completeProtectionProfile", () => {
    it("declares the registry-backed changes AFTER the facts (no delta), seals the row, mirrors the milestone", async () => {
        state.profile = { childrenCount: 1, dependentsCount: 1, employmentStatus: "employed", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"] }
        state.row = { intent: "find_gaps", riskConcerns: ["income"], recentChanges: ["new_child", "health_changed"], unsureSteps: [], confidenceLevel: "gaps", completedAt: null }
        const out = await completeProtectionProfile()
        await flushAfter()
        expect(declareLifeEvent).toHaveBeenCalledTimes(1)
        expect((declareLifeEvent.mock.calls as any[])[0][0]).toMatchObject({ userId: "user-1", definitionId: "birth", source: "customer_declared", confidence: "high", applyDelta: false })
        expect((db.protectionProfile.update.mock.calls as any[])[0][0].data.completedAt).toBeInstanceOf(Date)
        // A declaration already ran the engine — no second run.
        expect(refreshProtectionScore).not.toHaveBeenCalled()
        expect(recordConversionEvent).toHaveBeenCalledWith("user-1", "protection_profile_completed", expect.objectContaining({ intent: "find_gaps", confidence: "gaps" }))
        expect(out.priorities.find((p) => p.id === "money:income")?.importance).toBe("high")
        expect(out.countedTotal).toBe(10)
    })

    it("runs the engine once when there was nothing to declare, and is read-only the second time", async () => {
        state.profile = { residenceType: "rented", answeredFields: ["residenceType"] }
        state.row = { recentChanges: [], unsureSteps: ["people"], completedAt: null }
        await completeProtectionProfile()
        await flushAfter()
        expect(refreshProtectionScore).toHaveBeenCalledWith("user-1", "profile_update")
        expect(db.protectionProfile.update).toHaveBeenCalledTimes(1)
        vi.clearAllMocks()
        await completeProtectionProfile()
        expect(db.protectionProfile.update).not.toHaveBeenCalled()
        expect(recordConversionEvent).not.toHaveBeenCalled()
    })
})

describe("skipProtectionProfile", () => {
    it("records the skip and sends the person to the dashboard", async () => {
        const res = await skipProtectionProfile()
        expect(res).toEqual({ redirectTo: "/dashboard" })
        expect(state.row?.skippedAt).toBeInstanceOf(Date)
    })
})
