/**
 * Admin-managed runtime AI routing config — the cached read path.
 *
 * Mirrors lib/pricing/plan-catalog.ts: `unstable_cache` under a tag with a
 * 300s TTL backstop; admin writes call `revalidateTag(TAG, "max")` so edits
 * land immediately. Fallback rungs guarantee **an AI call never fails because
 * config is unreadable**: a DB error, a missing row, or an invalid row all
 * resolve to `{}` / a skipped row — i.e. today's pure-env behavior.
 *
 * Precedence (enforced in model-router.ts, which stays pure/sync):
 *   explicit req.provider (failover ladder)  >  per-operation DB override
 *   >  DB primaryProvider  >  env (AI_SERVICE_TYPE / key priority).
 * A per-operation model override applies ONLY when its provider matches the
 * resolved provider — a ladder-pinned different provider serves its own
 * env-configured models, never a model name from the wrong vendor.
 */

import { unstable_cache } from "next/cache"
import { logger } from "@/lib/logger"
import type { AIServiceType } from "./ai-service.factory"
import type { AiOperationOverride, AiRuntimeOverrides, RouteOperation } from "./model-router"

export type { AiOperationOverride, AiRuntimeOverrides }

export const AI_RUNTIME_CONFIG_CACHE_TAG = "ai-runtime-config"

/** The sentinel row key for the global primary-provider override. */
export const PRIMARY_PROVIDER_KEY = "primaryProvider"

/** Operations an admin can pin (mirrors RouteOperation). */
export const CONFIGURABLE_OPERATIONS: RouteOperation[] = [
    "extractPolicyData",
    "analyzeGaps",
    "analyzePolicyClarity",
    "askQuestion",
    "analyzeRiskProfile",
    "translate",
]

const VALID_PROVIDERS: ReadonlySet<string> = new Set(["gemini", "anthropic", "openai", "mock"])

function isConfigurableOperation(key: string): key is RouteOperation {
    return (CONFIGURABLE_OPERATIONS as string[]).includes(key)
}

/** Exported for tests — the uncached loader with all fallback rungs. */
export async function loadAiRuntimeOverridesUncached(): Promise<AiRuntimeOverrides> {
    let rows: Array<{ configKey: string; provider: string; model: string | null; isActive: boolean }>
    try {
        const { db } = await import("@/lib/db")
        rows = await db.aiRuntimeConfig.findMany({
            select: { configKey: true, provider: true, model: true, isActive: true },
        })
    } catch (error) {
        logger("error", "AI runtime config load failed — serving env defaults", {
            error: error instanceof Error ? error.message : String(error),
        })
        return {}
    }

    const overrides: AiRuntimeOverrides = {}
    for (const row of rows) {
        if (!row.isActive) continue
        if (row.provider === "auto") continue // pure env behavior, same as no row
        if (!VALID_PROVIDERS.has(row.provider)) {
            logger("warn", "AI runtime config row skipped — unknown provider", { configKey: row.configKey, provider: row.provider })
            continue
        }
        if (row.configKey === PRIMARY_PROVIDER_KEY) {
            overrides.primaryProvider = row.provider as AIServiceType
            continue
        }
        if (!isConfigurableOperation(row.configKey)) {
            logger("warn", "AI runtime config row skipped — unknown config key", { configKey: row.configKey })
            continue
        }
        if (!row.model || row.model.trim().length === 0) {
            logger("warn", "AI runtime config row skipped — pinned provider without a model", { configKey: row.configKey })
            continue
        }
        overrides.operations = overrides.operations ?? {}
        overrides.operations[row.configKey] = {
            provider: row.provider as AIServiceType,
            model: row.model.trim(),
        }
    }
    return overrides
}

/**
 * Cached accessor. TTL is the backstop only — admin saves revalidate the tag,
 * so edits land on the next request.
 */
export const getAiRuntimeOverrides = unstable_cache(
    loadAiRuntimeOverridesUncached,
    [AI_RUNTIME_CONFIG_CACHE_TAG],
    { tags: [AI_RUNTIME_CONFIG_CACHE_TAG], revalidate: 300 }
)
