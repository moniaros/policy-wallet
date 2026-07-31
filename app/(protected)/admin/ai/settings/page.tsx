export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { TOKEN_COSTS } from "@/lib/token-utils"
import {
    loadAiRuntimeOverridesUncached,
    CONFIGURABLE_OPERATIONS,
    PRIMARY_PROVIDER_KEY,
} from "@/lib/services/ai/runtime-config"
import { resolveRoute, selectPrimaryProvider, type RouteOperation } from "@/lib/services/ai/model-router"
import { updateAiModelConfig } from "./actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
const labelClass = "block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1"

const OPERATION_HELP: Record<string, string> = {
    extractPolicyData: "Policy PDF extraction (upload parse + deep pipeline step 2)",
    analyzeGaps: "Coverage-gap detection (deep pipeline)",
    analyzePolicyClarity: "Plain-language clarity report (deep pipeline)",
    askQuestion: "Interactive policy Q&A (and MEDIC suggest)",
    analyzeRiskProfile: "Risk-profile portfolio analysis",
    translate: "Greek→English batch translation (Gemini SDK only)",
}

export default async function AiSettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string; warn?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }
    const { saved, warn } = await searchParams

    const [rows, overrides] = await Promise.all([
        db.aiRuntimeConfig.findMany(),
        // Uncached read — the admin page must show the truth, not the cache.
        loadAiRuntimeOverridesUncached(),
    ])
    const rowByKey = new Map(rows.map((r) => [r.configKey, r]))
    const knownModels = Object.keys(TOKEN_COSTS)
    const primaryProvider = selectPrimaryProvider(overrides)

    const configRows = [
        ...CONFIGURABLE_OPERATIONS.map((op) => {
            const decision = resolveRoute({ operation: op }, overrides)
            const isOverridden = Boolean(overrides.operations?.[op])
            return {
                key: op as string,
                help: OPERATION_HELP[op] ?? "",
                live: `${decision.provider} / ${decision.model}`,
                source: isOverridden ? "admin override" : "env default",
                providers: op === "translate" ? ["auto", "gemini", "mock"] : ["auto", "gemini", "anthropic", "openai", "mock"],
                allowModel: true,
            }
        }),
        {
            key: PRIMARY_PROVIDER_KEY,
            help: "Which provider serves as the primary for auto-routed calls and the analysis pipeline",
            live: primaryProvider,
            source: overrides.primaryProvider ? "admin override" : "env default",
            providers: ["auto", "gemini", "anthropic", "openai", "mock"],
            allowModel: false,
        },
    ]

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div>
                <Link href="/admin/ai" className="text-sm text-primary dark:text-mint hover:underline">← AI Performance</Link>
                <h1 className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-100">AI Model Settings</h1>
                <p className="mt-2 text-stone-600 dark:text-stone-400 max-w-3xl">
                    Pin the provider and model each AI operation runs on, overriding the environment
                    defaults at runtime. &quot;auto&quot; keeps the environment behavior. Changes take effect on
                    the next AI call (cache tag is revalidated on save). Validate model changes with{" "}
                    <code>npm run eval</code> before and after.
                </p>
            </div>

            {saved === "1" && (
                <div className="rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/15 p-3 text-sm font-medium text-[#166534] dark:text-mint">
                    Saved. The next AI call uses the new configuration.
                    {warn === "unknown-model" && (
                        <span className="block mt-1 text-amber-700 dark:text-amber-300">
                            Note: the model is unknown to TOKEN_COSTS — usage will be metered at the conservative unknown-model rate.
                        </span>
                    )}
                </div>
            )}
            {saved === "unchanged" && (
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-3 text-sm text-stone-600 dark:text-stone-400">
                    No changes to save.
                </div>
            )}

            <datalist id="known-models">
                {knownModels.map((m) => (
                    <option key={m} value={m} />
                ))}
            </datalist>

            <div className="space-y-4">
                {configRows.map((row) => {
                    const dbRow = rowByKey.get(row.key)
                    return (
                        <section key={row.key} className={`${card} p-4`}>
                            <form action={updateAiModelConfig} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 items-end">
                                <input type="hidden" name="configKey" value={row.key} />
                                <div>
                                    <div className="font-mono text-sm font-semibold text-stone-900 dark:text-stone-100">{row.key}</div>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{row.help}</p>
                                    <p className="text-xs mt-1">
                                        <span className="text-stone-500 dark:text-stone-400">Live: </span>
                                        <span className="font-mono text-stone-800 dark:text-stone-200">{row.live}</span>{" "}
                                        <span className={row.source === "admin override"
                                            ? "inline-block px-1.5 py-0.5 rounded text-micro font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                            : "inline-block px-1.5 py-0.5 rounded text-micro font-semibold bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300"}>
                                            {row.source}{dbRow && row.source === "admin override" ? ` v${dbRow.version}` : ""}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor={`provider-${row.key}`} className={labelClass}>Provider</label>
                                    <select
                                        id={`provider-${row.key}`}
                                        name="provider"
                                        defaultValue={dbRow?.isActive ? dbRow.provider : "auto"}
                                        className="pw-input pw-input-sm"
                                    >
                                        {row.providers.map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`model-${row.key}`} className={labelClass}>
                                        {row.allowModel ? "Model" : "Model (n/a)"}
                                    </label>
                                    <input
                                        id={`model-${row.key}`}
                                        name="model"
                                        list="known-models"
                                        defaultValue={row.allowModel ? (dbRow?.model ?? "") : ""}
                                        disabled={!row.allowModel}
                                        placeholder={row.allowModel ? "e.g. claude-haiku-4-5" : "—"}
                                        className="pw-input pw-input-sm min-w-56"
                                    />
                                </div>
                                <button type="submit" className="pw-primary-button px-4 py-2">Save</button>
                            </form>
                        </section>
                    )
                })}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-3xl">
                Precedence: an explicit failover pin always wins, then the per-operation override, then the
                primary provider, then the environment. A per-operation model applies only while its
                provider is the resolved provider — during provider failover the fallback provider serves
                its own environment models.
            </p>
        </div>
    )
}
