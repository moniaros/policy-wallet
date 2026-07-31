/**
 * Pure parsing/validation + diff for the /admin/ai/settings editor.
 *
 * Kept out of the "use server" action file so it unit-tests without server
 * mocks (the lib/admin/plan-update.ts convention). Enforces the row semantics:
 * a config row is either provider="auto" with no model (pure env behavior) or
 * FULLY pinned (provider + non-empty model). "Pinned provider, env model" is
 * deliberately not representable — it would add a third precedence rung that
 * the dashboard could not display truthfully.
 */

import { TOKEN_COSTS } from "@/lib/token-utils"
import {
    CONFIGURABLE_OPERATIONS,
    PRIMARY_PROVIDER_KEY,
} from "@/lib/services/ai/runtime-config"

export const CONFIG_KEYS: string[] = [...CONFIGURABLE_OPERATIONS, PRIMARY_PROVIDER_KEY]

/** The translator is hardwired to the google() SDK — only these make sense. */
const TRANSLATE_PROVIDERS = new Set(["auto", "gemini", "mock"])
const ALL_PROVIDERS = new Set(["auto", "gemini", "anthropic", "openai", "mock"])

export interface AiConfigFormInput {
    configKey: string
    provider: string
    /** null iff provider === "auto" (or the primaryProvider sentinel row). */
    model: string | null
    /** Non-blocking warnings (e.g. unknown model → conservative metering). */
    warnings: string[]
}

export interface ProviderKeyAvailability {
    gemini: boolean
    anthropic: boolean
    openai: boolean
}

/** Throws Error with a readable message on any violation. */
export function parseAiConfigForm(
    formData: FormData,
    keysAvailable: ProviderKeyAvailability
): AiConfigFormInput {
    const configKey = String(formData.get("configKey") ?? "")
    const provider = String(formData.get("provider") ?? "auto").toLowerCase()
    const rawModel = String(formData.get("model") ?? "").trim()
    const warnings: string[] = []

    if (!CONFIG_KEYS.includes(configKey)) {
        throw new Error(`Invalid configKey: ${configKey || "(empty)"}`)
    }
    if (!ALL_PROVIDERS.has(provider)) {
        throw new Error(`Invalid provider: ${provider}`)
    }
    if (configKey === "translate" && !TRANSLATE_PROVIDERS.has(provider)) {
        throw new Error("The translate operation is hardwired to the Gemini SDK — pick auto, gemini or mock.")
    }

    const isPrimaryRow = configKey === PRIMARY_PROVIDER_KEY

    if (provider === "auto") {
        if (rawModel) {
            throw new Error('Provider "auto" keeps the environment defaults — clear the model field to save it, or pin a provider.')
        }
        return { configKey, provider, model: null, warnings }
    }

    // The primary-provider sentinel pins the provider only; per-operation
    // models stay with their own rows.
    if (isPrimaryRow) {
        if (rawModel) {
            throw new Error("The primary-provider row pins the provider only — set models on the per-operation rows.")
        }
    } else if (!rawModel) {
        throw new Error("A pinned provider needs a model. Pick one, or set the provider back to auto.")
    }

    // Block a pin whose API key is absent: the gateway paths could mask it via
    // failover, but the analysis pipeline would fail at the primary on every run.
    if (provider !== "mock") {
        const available = keysAvailable[provider as keyof ProviderKeyAvailability]
        if (!available) {
            throw new Error(`Provider "${provider}" has no API key configured in this environment — pinning it would fail every call.`)
        }
    }

    // Unknown model: warn, don't block — a newly released model may predate a
    // TOKEN_COSTS entry; the metering fallback over-prices conservatively.
    if (rawModel && !(rawModel in TOKEN_COSTS)) {
        warnings.push(
            `Model "${rawModel}" has no TOKEN_COSTS entry — usage will be metered at the conservative unknown-model rate until one is added.`
        )
    }

    return { configKey, provider, model: isPrimaryRow ? null : rawModel, warnings }
}

export interface AiConfigDiffEntry {
    field: "provider" | "model" | "isActive"
    from: unknown
    to: unknown
}

/** Per-field {from,to} diff (PlanRevision shape). Empty array = no-op save. */
export function computeAiConfigDiff(
    before: { provider: string; model: string | null } | null,
    after: { provider: string; model: string | null }
): AiConfigDiffEntry[] {
    const prev = before ?? { provider: "auto", model: null }
    const diff: AiConfigDiffEntry[] = []
    if (prev.provider !== after.provider) {
        diff.push({ field: "provider", from: prev.provider, to: after.provider })
    }
    if ((prev.model ?? null) !== (after.model ?? null)) {
        diff.push({ field: "model", from: prev.model ?? null, to: after.model ?? null })
    }
    return diff
}
