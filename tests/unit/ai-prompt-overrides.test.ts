/**
 * Operator-guidance override reader — loader + resolution contract.
 *
 * Pins: the loader NEVER throws (DB error → {} → prompts run without
 * guidance); inactive/empty rows are skipped; resolution prefers the exact
 * (operation, lineOfBusiness) row over the operation's global row and returns
 * undefined when neither exists.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
// unstable_cache needs a Next server context; pass through in unit tests.
vi.mock("next/cache", () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}))

const findMany = vi.hoisted(() => vi.fn())
vi.mock("@/lib/db", () => ({ db: { aiPromptOverride: { findMany } } }))

import {
    loadPromptOverridesUncached,
    resolveOperatorGuidance,
    promptOverrideKey,
    GLOBAL_LINE_OF_BUSINESS,
} from "@/lib/services/ai/prompt-overrides"

beforeEach(() => {
    findMany.mockReset()
})

describe("loadPromptOverridesUncached — never throws", () => {
    it("returns {} on a DB error (prompts run without guidance)", async () => {
        findMany.mockRejectedValue(new Error("db down"))
        await expect(loadPromptOverridesUncached()).resolves.toEqual({})
    })

    it("keys active rows by operation:lineOfBusiness and skips empty guidance", async () => {
        findMany.mockResolvedValue([
            { operation: "askQuestion", lineOfBusiness: "__global__", guidance: "Restate the policy number." },
            { operation: "askQuestion", lineOfBusiness: "motor", guidance: "Mention the green card." },
            { operation: "analyzeGaps", lineOfBusiness: "health", guidance: "   " },
        ])
        await expect(loadPromptOverridesUncached()).resolves.toEqual({
            "askQuestion:__global__": "Restate the policy number.",
            "askQuestion:motor": "Mention the green card.",
        })
    })

    it("queries active rows only (isActive filter is in the where clause)", async () => {
        findMany.mockResolvedValue([])
        await loadPromptOverridesUncached()
        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { isActive: true } })
        )
    })
})

describe("resolveOperatorGuidance — exact LoB, then global, then undefined", () => {
    const map = {
        [promptOverrideKey("askQuestion", GLOBAL_LINE_OF_BUSINESS)]: "GLOBAL",
        [promptOverrideKey("askQuestion", "motor")]: "MOTOR",
    }

    it("prefers the exact line-of-business row", () => {
        expect(resolveOperatorGuidance(map, "askQuestion", "motor")).toBe("MOTOR")
    })

    it("falls back to the operation's global row for an unconfigured LoB", () => {
        expect(resolveOperatorGuidance(map, "askQuestion", "health")).toBe("GLOBAL")
        expect(resolveOperatorGuidance(map, "askQuestion")).toBe("GLOBAL")
        expect(resolveOperatorGuidance(map, "askQuestion", null)).toBe("GLOBAL")
    })

    it("returns undefined when the operation has no rows at all", () => {
        expect(resolveOperatorGuidance(map, "analyzeGaps", "motor")).toBeUndefined()
        expect(resolveOperatorGuidance({}, "askQuestion", "motor")).toBeUndefined()
    })
})
