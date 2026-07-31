/**
 * Admin-authored operator guidance — the cached read path.
 *
 * Mirrors runtime-config.ts / lib/pricing/plan-catalog.ts: `unstable_cache`
 * under a tag with a 300s TTL backstop; admin writes call
 * `revalidateTag(TAG, "max")` so edits land on the next request. The loader
 * NEVER throws — a DB error resolves to an empty map, i.e. today's
 * no-guidance behavior. An AI call must never fail because prompt config is
 * unreadable.
 *
 * The map value is a plain Record (NOT a Map): unstable_cache serializes the
 * return value, and a Map would come back empty.
 *
 * Guidance content is validated at save time (validateOperatorGuidance) and
 * rendered additively under an OPERATOR GUIDANCE label by formatOperatorGuidance
 * in prompts.ts — it supplements the canonical task rules, never replaces them.
 */

import { unstable_cache } from "next/cache"
import { logger } from "@/lib/logger"

export const AI_PROMPT_OVERRIDES_CACHE_TAG = "ai-prompt-overrides"

/**
 * Sentinel for "applies to every line of business". A sentinel, not NULL,
 * because the (operation, lineOfBusiness) unique index must reject duplicate
 * global rows — Postgres treats NULLs as distinct.
 */
export const GLOBAL_LINE_OF_BUSINESS = "__global__"

/** Operations whose prompts accept operator guidance. `translate` is excluded —
 *  its prompt lives inside the batch translator, not prompts.ts. */
export const PROMPT_OPERATIONS = [
    "extractPolicyData",
    "analyzeGaps",
    "analyzePolicyClarity",
    "askQuestion",
    "analyzeRiskProfile",
] as const

export type PromptOperation = (typeof PROMPT_OPERATIONS)[number]

/** Keyed "{operation}:{lineOfBusiness}" → guidance text. */
export type PromptOverrideMap = Record<string, string>

export function promptOverrideKey(operation: string, lineOfBusiness: string): string {
    return `${operation}:${lineOfBusiness}`
}

/** Exported for tests — the uncached loader with the never-throw contract. */
export async function loadPromptOverridesUncached(): Promise<PromptOverrideMap> {
    let rows: Array<{ operation: string; lineOfBusiness: string; guidance: string }>
    try {
        const { db } = await import("@/lib/db")
        rows = await db.aiPromptOverride.findMany({
            where: { isActive: true },
            select: { operation: true, lineOfBusiness: true, guidance: true },
        })
    } catch (error) {
        logger("error", "AI prompt overrides load failed — serving prompts without guidance", {
            error: error instanceof Error ? error.message : String(error),
        })
        return {}
    }

    const map: PromptOverrideMap = {}
    for (const row of rows) {
        if (!row.guidance || row.guidance.trim().length === 0) continue
        map[promptOverrideKey(row.operation, row.lineOfBusiness)] = row.guidance
    }
    return map
}

/**
 * Cached accessor. TTL is the backstop only — admin saves revalidate the tag,
 * so edits land on the next request.
 */
export const getPromptOverrides = unstable_cache(
    loadPromptOverridesUncached,
    [AI_PROMPT_OVERRIDES_CACHE_TAG],
    { tags: [AI_PROMPT_OVERRIDES_CACHE_TAG], revalidate: 300 }
)

/**
 * Resolve the guidance for one call: exact (operation, lineOfBusiness) match
 * first, then the operation's global row, else undefined (no guidance block).
 */
export function resolveOperatorGuidance(
    map: PromptOverrideMap,
    operation: PromptOperation,
    lineOfBusiness?: string | null
): string | undefined {
    if (lineOfBusiness && lineOfBusiness !== GLOBAL_LINE_OF_BUSINESS) {
        const exact = map[promptOverrideKey(operation, lineOfBusiness)]
        if (exact) return exact
    }
    return map[promptOverrideKey(operation, GLOBAL_LINE_OF_BUSINESS)]
}
