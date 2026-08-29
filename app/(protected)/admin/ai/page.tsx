export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { formatCurrency, formatDateTime } from "@/lib/i18n/format"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { OPERATION_LABELS } from "@/lib/admin/ai-prompt-update"
import { getAiPerformance } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

function fmtInt(n: number): string {
    return new Intl.NumberFormat("en-US").format(Math.round(n))
}
function fmtEur(n: number): string {
    // AI costs are fractions of a cent: keep 4 decimals through the shared
    // formatter so a real charge can never round to €0.00. formatEur (2dp)
    // is deliberately NOT used here.
    return formatCurrency(n, "en", { decimals: 4 })
}
function fmtMs(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`
}

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/** Aggregate operational metrics are NOT an advice surface, so no AiDisclaimer. */
export default async function AiPerformancePage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }

    const s = await getAiPerformance(24, 30)
    const maxTrend = Math.max(1, ...s.trend.map((t) => t.tokens))
    const maxRouting = Math.max(1, ...s.routing.map((r) => r.calls))

    const successAccent =
        s.runs.successRatePct == null
            ? "text-stone-900 dark:text-stone-100"
            : s.runs.successRatePct >= 95
              ? "text-status-success"
              : s.runs.successRatePct >= 80
                ? "text-amber-700 dark:text-amber-300"
                : "text-red-700 dark:text-red-300"

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">AI Performance</h1>
                    <p className="mt-2 text-stone-600 dark:text-stone-400">
                        Snapshot generated at {formatDateTime(s.generatedAt, 'en')} for the last {s.windowHours} hours.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/ai/settings" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        Model Settings
                    </Link>
                    <Link href="/admin/ai/prompts" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        Prompt Overrides
                    </Link>
                    <Link href="/admin/gaps" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        Gap Definitions
                    </Link>
                    <a href="/admin/tokens" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        Token Analytics
                    </a>
                    <a href="/admin/launch-readiness" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        Launch Readiness
                    </a>
                </div>
            </div>

            {/* Headline tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${card} p-4`}>
                    <div className="text-xs text-stone-500 dark:text-stone-400">Success rate</div>
                    <div className={`mt-1 text-2xl font-bold ${successAccent}`}>
                        {s.runs.successRatePct == null ? "—" : `${s.runs.successRatePct}%`}
                    </div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        {fmtInt(s.runs.completed)} of {fmtInt(s.runs.total - s.runs.blocked)} non-blocked runs
                    </div>
                </div>
                <div className={`${card} p-4`}>
                    <div className="text-xs text-stone-500 dark:text-stone-400">Degraded completions</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{fmtInt(s.runs.degraded)}</div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">{fmtInt(s.runs.failed)} failed · {fmtInt(s.runs.blocked)} blocked</div>
                </div>
                <div className={`${card} p-4`}>
                    <div className="text-xs text-stone-500 dark:text-stone-400">AI cost (window)</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{fmtEur(s.cost.totalCostEur)}</div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">avg {s.runs.avgActualTotalTokens == null ? "—" : fmtInt(s.runs.avgActualTotalTokens)} tok/run</div>
                </div>
                <div className={`${card} p-4`}>
                    <div className="text-xs text-stone-500 dark:text-stone-400">Blocked / flagged inputs</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
                        {fmtInt(s.guardrail.blockedInputs)} <span className="text-base font-medium text-stone-500 dark:text-stone-400">/ {fmtInt(s.guardrail.flaggedInputs)}</span>
                    </div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">zero-cost guardrail (attack pressure)</div>
                </div>
            </div>

            {/* Active configuration — what the next call runs on */}
            <section className={card}>
                <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Active configuration</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">What the next AI call runs on, per operation</p>
                    </div>
                    <Link href="/admin/ai/settings" className="text-sm text-primary dark:text-mint hover:underline">Edit →</Link>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-stone-500 dark:text-stone-400">
                                <th className="py-2 pr-4">Operation</th>
                                <th className="py-2 pr-4">Provider</th>
                                <th className="py-2 pr-4">Model</th>
                                <th className="py-2 pr-4">Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {s.activeConfiguration.map((c) => (
                                <tr key={c.configKey} className="border-t border-stone-100 dark:border-stone-700">
                                    <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{c.configKey}</td>
                                    <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{c.provider}</td>
                                    <td className="py-2 pr-4 font-mono text-xs text-stone-700 dark:text-stone-300">{c.model ?? "—"}</td>
                                    <td className="py-2 pr-4">
                                        <span className={c.source === "db_override"
                                            ? "px-1.5 py-0.5 rounded text-micro font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                            : "px-1.5 py-0.5 rounded text-micro font-semibold bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300"}>
                                            {c.source === "db_override" ? "admin override" : "env default"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Prompt overrides + policy-linked usage per line of business */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Prompt overrides</h2>
                            <p className="text-xs text-stone-500 dark:text-stone-400">Admin operator guidance in effect (identity only — no prompt text)</p>
                        </div>
                        <Link href="/admin/ai/prompts" className="text-sm text-primary dark:text-mint hover:underline">Edit →</Link>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        {s.promptOverrides.length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">None — every prompt runs with its built-in rules only.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-stone-500 dark:text-stone-400">
                                        <th className="py-2 pr-4">Operation</th>
                                        <th className="py-2 pr-4">Line of business</th>
                                        <th className="py-2 pr-4">Version</th>
                                        <th className="py-2 pr-4">Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.promptOverrides.map((o) => (
                                        <tr key={o.operation + ":" + o.lineOfBusiness} className="border-t border-stone-100 dark:border-stone-700">
                                            <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{OPERATION_LABELS[o.operation] ?? o.operation}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{o.lineOfBusiness === "__global__" ? "Global" : normalizeBranch(o.lineOfBusiness).label.en}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">v{o.version}</td>
                                            <td className="py-2 pr-4">{o.isActive ? "yes" : <span className="text-red-600 dark:text-red-400">no</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                <section className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Usage by line of business</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Policy-linked usage only (rows without a policy are excluded)</p>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        {s.usageByLineOfBusiness.length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No policy-linked AI usage in this window.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-stone-500 dark:text-stone-400">
                                        <th className="py-2 pr-4">Line of business</th>
                                        <th className="py-2 pr-4">Calls</th>
                                        <th className="py-2 pr-4">Tokens</th>
                                        <th className="py-2 pr-4">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.usageByLineOfBusiness.map((u) => (
                                        <tr key={u.lineOfBusiness} className="border-t border-stone-100 dark:border-stone-700">
                                            <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{normalizeBranch(u.lineOfBusiness).label.en}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtInt(u.calls)}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtInt(u.totalTokens)}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtEur(u.costEur)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>

            {/* Routing distribution + cost per operation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Routing distribution</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Which model handled what (billed calls in window)</p>
                    </div>
                    <div className="p-4 space-y-2">
                        {s.routing.length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No billed AI calls in this window.</p>
                        ) : (
                            s.routing.slice(0, 12).map((r) => (
                                <div key={`${r.model}:${r.operationType}`} className="text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-stone-700 dark:text-stone-300">{r.model}</span>
                                        <span className="text-stone-500 dark:text-stone-400">{r.operationType} · {fmtInt(r.calls)}</span>
                                    </div>
                                    <div className="mt-1 h-2 rounded bg-stone-100 dark:bg-stone-700 overflow-hidden">
                                        <div className="h-full bg-primary dark:bg-mint" style={{ width: `${Math.max(2, (r.calls / maxRouting) * 100)}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Cost per operation</h2>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-stone-500 dark:text-stone-400">
                                    <th className="py-2 pr-4">Operation</th>
                                    <th className="py-2 pr-4">Calls</th>
                                    <th className="py-2 pr-4">Tokens</th>
                                    <th className="py-2 pr-4">Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.cost.byOperation.length === 0 ? (
                                    <tr><td colSpan={4} className="py-2 text-stone-500 dark:text-stone-400">No usage in this window.</td></tr>
                                ) : (
                                    s.cost.byOperation.map((o) => (
                                        <tr key={o.operationType} className="border-t border-stone-100 dark:border-stone-700">
                                            <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{o.operationType}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtInt(o.calls)}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtInt(o.totalTokens)}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtEur(o.costEur)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Latency + failure/remediation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Step latency (p50 / p95)</h2>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-stone-500 dark:text-stone-400">
                                    <th className="py-2 pr-4">Step</th>
                                    <th className="py-2 pr-4">p50</th>
                                    <th className="py-2 pr-4">p95</th>
                                    <th className="py-2 pr-4">Samples</th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.stepLatency.length === 0 ? (
                                    <tr><td colSpan={4} className="py-2 text-stone-500 dark:text-stone-400">No completed steps in this window.</td></tr>
                                ) : (
                                    s.stepLatency.map((l) => (
                                        <tr key={l.stepKey} className="border-t border-stone-100 dark:border-stone-700">
                                            <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{l.stepKey}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtMs(l.p50Ms)}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtMs(l.p95Ms)}</td>
                                            <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{fmtInt(l.samples)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Failure mix &amp; remediation</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Run failure codes</div>
                            {s.failureMix.length === 0 ? (
                                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">None in this window.</p>
                            ) : (
                                <ul className="mt-1 space-y-1">
                                    {s.failureMix.map((f) => (
                                        <li key={f.code} className="flex justify-between text-sm">
                                            <span className="font-mono text-xs text-stone-700 dark:text-stone-300">{f.code}</span>
                                            <span className="text-stone-500 dark:text-stone-400">{fmtInt(f.count)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Remediation / failover used</div>
                            {s.remediation.length === 0 ? (
                                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">No remediation in this window.</p>
                            ) : (
                                <ul className="mt-1 space-y-1">
                                    {s.remediation.map((r) => (
                                        <li key={`${r.remediationType}:${r.provider}`} className="flex justify-between text-sm">
                                            <span className="text-stone-700 dark:text-stone-300">{r.remediationType} <span className="text-stone-400">({r.provider})</span></span>
                                            <span className="text-stone-500 dark:text-stone-400">{fmtInt(r.count)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Token spend trend */}
            <section className={card}>
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Token spend trend ({s.trend.length} days)</h2>
                </div>
                <div className="p-4">
                    {s.trend.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No usage recorded.</p>
                    ) : (
                        <div className="flex items-end gap-1 h-32">
                            {s.trend.map((t) => (
                                <div key={t.date} className="flex-1 flex flex-col items-center justify-end" title={`${t.date}: ${fmtInt(t.tokens)} tokens · ${fmtEur(t.cost)}`}>
                                    <div className="w-full bg-primary/70 dark:bg-mint/70 rounded-t" style={{ height: `${Math.max(2, (t.tokens / maxTrend) * 100)}%` }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
