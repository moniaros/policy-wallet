export const runtime = 'nodejs'

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getLaunchReadiness } from "../actions"
import { formatDateTime } from "@/lib/i18n/format"

function formatDate(value: string | null | undefined) {
    if (!value) return "-"
    return formatDateTime(value, 'en')
}

const LEVEL_COPY: Record<"green" | "amber" | "red", string> = {
    green: "Launch readiness is green. No blockers detected in this snapshot.",
    amber: "Launch readiness is amber. Resolve warnings before go/no-go.",
    red: "Launch readiness is red. Blockers must be resolved before go/no-go.",
}

const LEVEL_CLASSES: Record<"green" | "amber" | "red", string> = {
    green: "bg-primary-soft border-primary/30 text-status-success dark:bg-primary/15 dark:border-primary/30",
    amber: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200",
    red: "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
}

const CHECK_STATUS_CLASSES: Record<"pass" | "warn" | "fail", string> = {
    pass: "bg-primary-soft text-status-success dark:bg-primary/15",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    fail: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

export default async function LaunchReadinessPage() {
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const snapshot = await getLaunchReadiness(24)
    const blockers = snapshot.signals.filter((signal) => signal.severity === "blocker")
    const warnings = snapshot.signals.filter((signal) => signal.severity === "warning")

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Launch Readiness</h1>
                    <p className="mt-2 text-stone-600 dark:text-stone-400">
                        Snapshot generated at {formatDate(snapshot.generatedAt)} for the last {snapshot.windowHours} hours.
                    </p>
                </div>
                <div className="flex gap-2">
                    <a
                        href="/admin/billing-reconciliation"
                        className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                        Billing Reconciliation
                    </a>
                    <a
                        href="/admin/dsr"
                        className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                        DSR Queue
                    </a>
                </div>
            </div>

            <div className={`rounded-lg border p-4 ${LEVEL_CLASSES[snapshot.level]}`}>
                <p className="text-sm font-semibold">{LEVEL_COPY[snapshot.level]}</p>
                <p className="mt-1 text-xs">
                    Blockers: {blockers.length} · Warnings: {warnings.length}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Synthetic Overall</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100 uppercase">
                        {snapshot.synthetic.overallStatus}
                    </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Billing Needs Attention</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
                        {snapshot.billing.needsAttention ? "Yes" : "No"}
                    </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">DSR Needs Attention</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
                        {snapshot.dsr.needsAttention ? "Yes" : "No"}
                    </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Total Signals</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.signals.length}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Blockers</h2>
                    </div>
                    <div className="p-4">
                        {blockers.length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No blockers detected.</p>
                        ) : (
                            <ul className="space-y-2">
                                {blockers.map((signal) => (
                                    <li key={signal.code} className="text-sm text-stone-800 dark:text-stone-200">
                                        <span className="font-mono text-xs text-stone-500 dark:text-stone-400">{signal.code}</span>
                                        <p>{signal.message}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Warnings</h2>
                    </div>
                    <div className="p-4">
                        {warnings.length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No warnings detected.</p>
                        ) : (
                            <ul className="space-y-2">
                                {warnings.map((signal) => (
                                    <li key={signal.code} className="text-sm text-stone-800 dark:text-stone-200">
                                        <span className="font-mono text-xs text-stone-500 dark:text-stone-400">{signal.code}</span>
                                        <p>{signal.message}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Synthetic Check Results</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-stone-500 dark:text-stone-400">
                                <th className="py-2 pr-4">Check</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.synthetic.checks.map((check) => (
                                <tr key={check.id} className="border-t border-stone-100 dark:border-stone-700">
                                    <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{check.id}</td>
                                    <td className="py-2 pr-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${CHECK_STATUS_CLASSES[check.status]}`}>
                                            {check.status}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{check.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 space-y-2">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Billing Snapshot</h2>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Failed webhooks in window: {snapshot.billing.summary.recentWebhookFailed}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Stale failed webhooks: {snapshot.billing.summary.staleFailedWebhookEvents}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Invoice/user mismatches: {snapshot.billing.summary.invoiceUserMismatches}
                    </p>
                </section>

                <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 space-y-2">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">DSR Snapshot</h2>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Open requests: {snapshot.dsr.summary.totalOpenRequests}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Pending beyond SLA: {snapshot.dsr.summary.pendingBeyondSla}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Failed requests in window: {snapshot.dsr.summary.failedInWindow}
                    </p>
                </section>
            </div>
        </div>
    )
}
