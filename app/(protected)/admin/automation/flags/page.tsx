export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { getFlags } from "@/lib/flags/config"
import { FEATURE_FLAGS, ROLLOUT_MODES } from "@/lib/flags/registry"
import { resetFlag, saveFlag } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
const pill = "text-kicker rounded px-1.5 py-0.5"

/**
 * Feature flags.
 *
 * This product already had feature flags — as environment variables read at the
 * call site. They worked; what they could not do was change, because a flip
 * meant editing the Vercel environment and redeploying. The one control you
 * reach for while something is going wrong in production cost a build.
 *
 * This page is the database layer in front of them. Precedence on read is
 * override → environment variable → the default declared in code, and the
 * "source" pill on each card says which of the three is currently answering.
 * That provenance is the part an operator cannot get anywhere else today.
 *
 * Mobile-first: cards at every width, and every control at least 44px tall,
 * because the realistic use is someone opening this on a phone during an
 * incident.
 */
export default async function FeatureFlagsPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const { saved } = await searchParams

    // Both reads degrade to empty rather than throwing. Code and migration
    // deploy separately here (the Prisma migrate CLI cannot reach this
    // database — DIRECT_URL is the transaction pooler), so this page has to
    // render during the window where one has landed and the other has not, and
    // say so, instead of returning a 500 that looks like a broken console.
    const [state, rows, revisions] = await Promise.all([
        getFlags(),
        db.featureFlag.findMany().catch(() => null),
        db.featureFlagRevision
            .findMany({ orderBy: { createdAt: "desc" }, take: 10 })
            .catch(() => null),
    ])
    const storageReady = rows !== null
    const rowBy = new Map((rows ?? []).map((r) => [r.key, r]))
    const history = revisions ?? []

    const byCategory = new Map<string, string[]>()
    for (const def of Object.values(FEATURE_FLAGS)) {
        const list = byCategory.get(def.category) ?? []
        list.push(def.key)
        byCategory.set(def.category, list)
    }

    return (
        <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Feature flags</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Switches that take effect without a deploy. Each one falls back to its
                        environment variable, so clearing an override restores what the deployment
                        says rather than turning the feature off.
                    </p>
                </div>
                <Link href="/admin/automation" className="pw-btn pw-btn-sm">Automation</Link>
            </div>

            {saved === "1" && (
                <p className="text-sm rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                    Saved. It applies to the next request.
                </p>
            )}
            {saved === "reset" && (
                <p className="text-sm rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                    Override cleared — that flag follows the deployment again.
                </p>
            )}
            {saved === "nochange" && (
                <p className="text-sm rounded-lg px-3 py-2 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                    Nothing changed, so no new version was recorded.
                </p>
            )}

            {!storageReady && (
                <p className="text-sm rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200">
                    The flags table could not be read — most likely the migration has not been
                    applied to this environment yet. Every value below is what the deployment
                    itself says, which is exactly what the product is currently doing. Saving is
                    disabled until the table exists.
                </p>
            )}
            {storageReady && state.degraded && (
                <p className="text-sm rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200">
                    Overrides could not be loaded, so every value below is the environment
                    default. This is the designed degradation — the product is behaving as
                    deployed — but overrides are not being applied right now.
                </p>
            )}

            {[...byCategory.entries()].sort().map(([category, keys]) => (
                <section key={category} className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        {category}
                    </h2>

                    <div className="space-y-2">
                        {keys.map((key) => {
                            const flag = state.flags[key]
                            const def = FEATURE_FLAGS[key]
                            const row = rowBy.get(key)
                            if (!flag) return null

                            return (
                                <article key={key} className={`${card} p-3 sm:p-4`}>
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-stone-900 dark:text-white">
                                                {def.label}
                                            </h3>
                                            <p className="font-mono text-xs text-stone-500 dark:text-stone-400 mt-0.5 break-all">
                                                {key}
                                            </p>
                                        </div>
                                        {/* Test id because "on"/"off" also appear as
                                            <option> labels in the form below, so text
                                            alone cannot address the state pill. */}
                                        <span
                                            data-testid={`flag-state-${key}`}
                                            className={`${pill} shrink-0 ${
                                                flag.enabled
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                    : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
                                            }`}
                                        >
                                            {flag.enabled ? "on" : "off"}
                                        </span>
                                    </div>

                                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
                                        {def.description}
                                    </p>

                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {/* Provenance: which of the three layers is answering. */}
                                        <span
                                            data-testid={`flag-source-${key}`}
                                            className={`${pill} ${
                                                flag.source === "override"
                                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                    : "bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300"
                                            }`}
                                            title={
                                                flag.source === "override"
                                                    ? "An override in this console is deciding this."
                                                    : flag.source === "env"
                                                      ? `Set by the ${def.envVar} environment variable.`
                                                      : "Nothing has set this; it is the default declared in code."
                                            }
                                        >
                                            {flag.source === "override"
                                                ? "override"
                                                : flag.source === "env"
                                                  ? "environment"
                                                  : "code default"}
                                        </span>
                                        {def.kind === "canary" && (
                                            <span className={`${pill} bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300`}>
                                                audience: {flag.rollout}
                                            </span>
                                        )}
                                        {def.safetyCritical && (
                                            <span className={`${pill} bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200`}>
                                                safety
                                            </span>
                                        )}
                                        {def.envOnly && (
                                            <span className={`${pill} bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300`}>
                                                read-only
                                            </span>
                                        )}
                                        {row && (
                                            <span className={`${pill} bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300`}>
                                                v{row.version}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 font-mono break-all">
                                        {def.envVar} · read at {def.readAt}
                                    </p>

                                    {def.envOnly || !storageReady ? (
                                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 border-l-2 border-stone-300 dark:border-stone-600 pl-2">
                                            {def.envOnly
                                                ? `Listed so its production value is visible, but it cannot be changed here. ${def.envOnlyReason ?? ""}`
                                                : "Not editable until the flags table exists in this environment."}
                                        </p>
                                    ) : (
                                        <form
                                            action={saveFlag}
                                            className="mt-3 flex flex-wrap items-end gap-2"
                                        >
                                            <input type="hidden" name="key" value={key} />

                                            {def.kind === "canary" ? (
                                                <label className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-xs text-stone-500 dark:text-stone-400">
                                                        Audience
                                                    </span>
                                                    <select
                                                        name="rollout"
                                                        defaultValue={row?.rollout ?? "inherit"}
                                                        className="pw-input pw-input-sm min-h-11"
                                                    >
                                                        <option value="inherit">
                                                            inherit ({flag.rollout})
                                                        </option>
                                                        {ROLLOUT_MODES.map((mode) => (
                                                            <option key={mode} value={mode}>
                                                                {mode}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            ) : (
                                                <label className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-xs text-stone-500 dark:text-stone-400">
                                                        State
                                                    </span>
                                                    <select
                                                        name="enabled"
                                                        defaultValue={
                                                            row?.enabled === null || row?.enabled === undefined
                                                                ? "inherit"
                                                                : String(row.enabled)
                                                        }
                                                        className="pw-input pw-input-sm min-h-11"
                                                    >
                                                        {/* "inherit" is not "off" — it hands the
                                                            decision back to the deployment. */}
                                                        <option value="inherit">
                                                            inherit ({flag.enabled ? "on" : "off"})
                                                        </option>
                                                        <option value="true">on</option>
                                                        <option value="false">off</option>
                                                    </select>
                                                </label>
                                            )}

                                            <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
                                                <span className="text-xs text-stone-500 dark:text-stone-400">
                                                    Why {def.safetyCritical && "(required to switch off)"}
                                                </span>
                                                <input
                                                    type="text"
                                                    name="notes"
                                                    defaultValue={row?.notes ?? ""}
                                                    placeholder="Kept in the version history"
                                                    className="pw-input pw-input-sm min-h-11"
                                                />
                                            </label>

                                            <button type="submit" className="pw-btn pw-btn-sm min-h-11">
                                                Save
                                            </button>
                                        </form>
                                    )}

                                    {row && !def.envOnly && (row.enabled !== null || row.rollout !== null) && (
                                        <form action={resetFlag} className="mt-2">
                                            <input type="hidden" name="key" value={key} />
                                            <button
                                                type="submit"
                                                className="text-xs text-stone-600 dark:text-stone-400 underline min-h-11"
                                            >
                                                Clear override — follow the deployment again
                                            </button>
                                        </form>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                </section>
            ))}

            <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Recent changes
                </h2>
                {history.length === 0 ? (
                    <p className={`${card} p-3 sm:p-4 text-sm text-stone-500 dark:text-stone-400`}>
                        No flag has been changed from this console yet.
                    </p>
                ) : (
                    <ol className="space-y-2">
                        {history.map((rev) => (
                            <li key={rev.id} className={`${card} p-3 text-sm`}>
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="font-mono text-xs text-stone-700 dark:text-stone-300 break-all">
                                        {(rev.snapshot as { key?: string })?.key ?? rev.flagId} · v{rev.version}
                                    </span>
                                    <span className="text-xs text-stone-500 dark:text-stone-400">
                                        {rev.changedByEmail} · {rev.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                                    </span>
                                </div>
                                <pre className="text-xs text-stone-600 dark:text-stone-400 mt-1 overflow-x-auto">
                                    {JSON.stringify(rev.changes)}
                                </pre>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </div>
    )
}
