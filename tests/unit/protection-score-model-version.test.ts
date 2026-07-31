/**
 * WP-05 follow-through — a cached score must not outlive the model that made it.
 *
 * Splitting "Property & Motor" (weight 20) into separate Home and Motor
 * categories changed what a STORED score means without changing its shape.
 * `ProtectionScore.categoryScores` is a plain `{ key: number }` map, so a row
 * written before the split still parses perfectly and still renders — except:
 *
 *  - `property: 100` used to mean "home OR car insured". Under the new
 *    categories it renders as «Κατοικία 100%», telling someone who insured only
 *    their car that their home is fully covered.
 *  - the overall number was a weighted average over a different category set,
 *    so it is not comparable to a freshly computed one either.
 *
 * Nothing repaired this on its own: `getCachedProtectionScore` never recomputes
 * by design (it is the render path, and recomputing there is a write + heavy
 * compute on a page GET). A pre-split row would therefore have been shown as
 * fact indefinitely.
 *
 * The fix is the one already used for the extraction cache: stamp the artifact
 * with the model version that produced it, and discard rather than reinterpret.
 * The stamp lives inside the existing JSON column, so it costs no migration.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    SCORE_MODEL_VERSION,
    decodeCategoryScores,
    encodeCategoryScores,
    isCurrentScoreModel,
} from "@/lib/services/gap-engine/protection-score"

const findUnique = vi.fn()
const upsert = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        protectionScore: {
            findUnique: (...a: unknown[]) => findUnique(...a),
            upsert: (...a: unknown[]) => upsert(...a),
        },
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

/** What a v1 row looked like: a bare map, no version marker anywhere. */
const LEGACY_ROW = {
    overallScore: 72,
    categoryScores: { health: 100, life: 0, property: 100, income: 40, liability: 0, other: 0 },
    gapCount: 2,
    expectedLines: ["motor", "health"],
    actualLines: ["motor"],
    computedAt: new Date(),
}

const CURRENT_ROW = {
    ...LEGACY_ROW,
    categoryScores: encodeCategoryScores({
        health: 100,
        life: 0,
        property: 0,
        motor: 100,
        income: 40,
        liability: 0,
        other: 0,
    }),
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
})

describe("the stored score carries the model that produced it", () => {
    it("stamps freshly encoded scores with the current version", () => {
        const encoded = encodeCategoryScores({ motor: 100 })

        expect(encoded.__scoreModelVersion).toBe(SCORE_MODEL_VERSION)
        expect(encoded.categories).toEqual({ motor: 100 })
    })

    it("reports an unstamped row as v1 rather than assuming it is current", () => {
        // The whole defect: a legacy row is indistinguishable from a current one
        // by shape alone, so "no marker" has to mean "old", never "fine".
        const decoded = decodeCategoryScores(LEGACY_ROW.categoryScores)

        expect(decoded.version).toBe(1)
        expect(decoded.categories.property).toBe(100)
    })

    it("round-trips a stamped row back to the numbers that went in", () => {
        const categories = { health: 100, motor: 50 }

        expect(decodeCategoryScores(encodeCategoryScores(categories)).categories).toEqual(categories)
    })

    it("treats only the current version as current", () => {
        expect(isCurrentScoreModel(encodeCategoryScores({ motor: 100 }))).toBe(true)
        expect(isCurrentScoreModel(LEGACY_ROW.categoryScores)).toBe(false)
        expect(isCurrentScoreModel({ __scoreModelVersion: 99, categories: {} })).toBe(false)
    })

    it("survives a null or malformed column without throwing", () => {
        // This is read on a render path; a corrupt row must degrade to "no
        // score", not to a 500 on someone's dashboard.
        expect(decodeCategoryScores(null).categories).toEqual({})
        expect(decodeCategoryScores(undefined).version).toBe(1)
        expect(decodeCategoryScores({ __scoreModelVersion: 2 }).categories).toEqual({})
    })

    it("is at least v2 — the split happened", () => {
        // Vacuity floor: with the constant at 1 every legacy row would count as
        // current and the guards below would all pass while protecting nothing.
        expect(SCORE_MODEL_VERSION).toBeGreaterThanOrEqual(2)
    })
})

describe("the render path refuses a superseded score", () => {
    it("returns null for a pre-split row, so the caller shows the provisional estimate", async () => {
        findUnique.mockResolvedValue(LEGACY_ROW)
        const { getCachedProtectionScore } = await import("@/lib/services/gap-engine")

        expect(await getCachedProtectionScore("user-1")).toBeNull()
    })

    it("returns a current row, unwrapped to the plain category map", async () => {
        findUnique.mockResolvedValue(CURRENT_ROW)
        const { getCachedProtectionScore } = await import("@/lib/services/gap-engine")
        const score = await getCachedProtectionScore("user-1")

        expect(score).not.toBeNull()
        expect(score!.categoryScores).toEqual({
            health: 100,
            life: 0,
            property: 0,
            motor: 100,
            income: 40,
            liability: 0,
            other: 0,
        })
        // The envelope is storage plumbing and must not leak to consumers.
        expect(score!.categoryScores).not.toHaveProperty("__scoreModelVersion")
        expect(score!.categoryScores).not.toHaveProperty("categories")
    })

    it("still returns null when there is no row at all", async () => {
        findUnique.mockResolvedValue(null)
        const { getCachedProtectionScore } = await import("@/lib/services/gap-engine")

        expect(await getCachedProtectionScore("user-1")).toBeNull()
    })

    it("does not report a home as covered on the evidence of a car policy", async () => {
        // The concrete harm, stated as a test: this exact legacy row says
        // property 100 for a portfolio whose only policy is motor.
        findUnique.mockResolvedValue({
            ...LEGACY_ROW,
            categoryScores: { property: 100 },
            actualLines: ["motor"],
        })
        const { getCachedProtectionScore } = await import("@/lib/services/gap-engine")

        expect(await getCachedProtectionScore("user-1")).toBeNull()
    })
})

describe("the recomputing path treats a superseded model as stale", () => {
    it("does not serve a recent row from an older model", async () => {
        // Written one minute ago — well inside the 24h freshness window — and
        // still unusable, because freshness is not the problem.
        findUnique.mockResolvedValue({ ...LEGACY_ROW, computedAt: new Date(Date.now() - 60_000) })
        const { getProtectionScore } = await import("@/lib/services/gap-engine")

        // Recompute is attempted; with no user rows behind the mock it throws
        // rather than quietly returning the stale numbers. Either way the
        // legacy figures never reach the caller.
        const result = await getProtectionScore("user-1").catch(() => "recomputed")

        expect(result).not.toMatchObject({ overallScore: LEGACY_ROW.overallScore })
    })

    it("serves a recent row from the current model without recomputing", async () => {
        findUnique.mockResolvedValue({ ...CURRENT_ROW, computedAt: new Date(Date.now() - 60_000) })
        const { getProtectionScore } = await import("@/lib/services/gap-engine")
        const result = await getProtectionScore("user-1")

        expect(result!.overallScore).toBe(CURRENT_ROW.overallScore)
        expect(result!.categoryScores.motor).toBe(100)
    })
})
