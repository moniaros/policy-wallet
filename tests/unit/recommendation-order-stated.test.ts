import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

import { recommendationOrder, statedPriorityRank } from "@/lib/services/gap-engine/recommendation-generator"

/**
 * A stated priority is a TIE-BREAK. It orders findings the engine cannot
 * separate; it never lifts one past a more urgent finding, never past one
 * the protection model weighs higher, and never demotes anything.
 */
const home = { urgency: "high", lineOfBusiness: "home", ruleId: "a" }
const motor = { urgency: "high", lineOfBusiness: "motor", ruleId: "b" }
const health = { urgency: "high", lineOfBusiness: "health", ruleId: "c" }
const criticalHome = { urgency: "critical", lineOfBusiness: "home", ruleId: "d" }

describe("statedPriorityRank", () => {
    it("ranks by the position of the first stated area that names the line", () => {
        expect(statedPriorityRank("motor", ["household", "mobility"])).toBe(1)
        expect(statedPriorityRank("MOTOR:own-damage", ["mobility"])).toBe(0)
        expect(statedPriorityRank("health", ["mobility"])).toBe(Number.MAX_SAFE_INTEGER)
        expect(statedPriorityRank("motor", null)).toBe(Number.MAX_SAFE_INTEGER)
        expect(statedPriorityRank("motor", [])).toBe(Number.MAX_SAFE_INTEGER)
    })
})

describe("recommendationOrder", () => {
    it("with nothing stated, equals fall back to the rule id", () => {
        expect([motor, home].sort(recommendationOrder(null)).map((r) => r.ruleId)).toEqual(["a", "b"])
    })

    it("a stated area breaks a tie between equals", () => {
        expect([home, motor].sort(recommendationOrder(["mobility"])).map((r) => r.ruleId)).toEqual(["b", "a"])
    })

    it("never lifts a finding past a more urgent one", () => {
        expect([motor, criticalHome].sort(recommendationOrder(["mobility"])).map((r) => r.ruleId)).toEqual(["d", "b"])
    })

    it("never lifts a finding past one the protection model weighs higher", () => {
        expect([motor, health].sort(recommendationOrder(["mobility"])).map((r) => r.ruleId)).toEqual(["c", "b"])
    })
})
