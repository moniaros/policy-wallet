export const runtime = 'nodejs'

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getBillingReconciliation } from "../actions"

function formatDate(value: string | null | undefined) {
    if (!value) return "-"
    return new Date(value).toLocaleString()
}

export default async function BillingReconciliationPage() {
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const snapshot = await getBillingReconciliation(24)

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Billing Reconciliation</h1>
                <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Snapshot generated at {formatDate(snapshot.generatedAt)} for the last {snapshot.windowHours} hours.
                </p>
            </div>

            <div className={`p-4 rounded-lg border ${snapshot.needsAttention ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" : "bg-primary-soft border-primary/30 dark:bg-primary/15 dark:border-primary/30"}`}>
                <p className={`text-sm font-semibold ${snapshot.needsAttention ? "text-amber-900 dark:text-amber-200" : "text-[#166534] dark:text-mint"}`}>
                    {snapshot.needsAttention
                        ? "Billing reconciliation requires attention. Review issues below before go/no-go."
                        : "No critical billing reconciliation issues detected in this window."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Active Subscriptions</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.activeSubscriptions}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Stripe Missing External ID</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.activeStripeMissingExternalId}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">RevenueCat Missing External ID</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.activeRevenueCatMissingExternalId}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Subscriptions Missing Recent Invoice</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.activePaidSubscriptionsWithoutRecentInvoice}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Invoice/User Mismatches</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.invoiceUserMismatches}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Processed Webhooks (Window)</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.recentWebhookProcessed}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Failed Webhooks (Window)</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.recentWebhookFailed}</div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400">Stale Failed Webhooks</div>
                    <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{snapshot.summary.staleFailedWebhookEvents}</div>
                </div>
            </div>

            <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Webhook Provider Breakdown</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-stone-500 dark:text-stone-400">
                                <th className="py-2 pr-4">Provider</th>
                                <th className="py-2 pr-4">Processed</th>
                                <th className="py-2 pr-4">Failed</th>
                                <th className="py-2 pr-4">Ignored</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.providerBreakdown.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-stone-500 dark:text-stone-400" colSpan={4}>No webhook traffic in this window.</td>
                                </tr>
                            ) : (
                                snapshot.providerBreakdown.map((row) => (
                                    <tr key={row.provider} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.provider}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.processed}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.failed}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.ignored}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Paid Subscriptions Without Recent Invoice</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-stone-500 dark:text-stone-400">
                                <th className="py-2 pr-4">Subscription</th>
                                <th className="py-2 pr-4">User</th>
                                <th className="py-2 pr-4">Provider</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Current Period End</th>
                                <th className="py-2 pr-4">Last Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.samples.subscriptionsWithoutRecentInvoice.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-stone-500 dark:text-stone-400" colSpan={6}>No missing-invoice subscriptions detected.</td>
                                </tr>
                            ) : (
                                snapshot.samples.subscriptionsWithoutRecentInvoice.map((row) => (
                                    <tr key={row.subscriptionId} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.subscriptionId}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.userId}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.provider}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.status}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{formatDate(row.currentPeriodEnd)}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{formatDate(row.lastInvoiceDate)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Invoice/User Mismatches</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-stone-500 dark:text-stone-400">
                                <th className="py-2 pr-4">Invoice</th>
                                <th className="py-2 pr-4">Invoice User</th>
                                <th className="py-2 pr-4">Subscription</th>
                                <th className="py-2 pr-4">Subscription User</th>
                                <th className="py-2 pr-4">Billing Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.samples.invoiceUserMismatches.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-stone-500 dark:text-stone-400" colSpan={5}>No invoice/user mismatches detected.</td>
                                </tr>
                            ) : (
                                snapshot.samples.invoiceUserMismatches.map((row) => (
                                    <tr key={row.invoiceId} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.invoiceId}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.invoiceUserId}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.subscriptionId}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.subscriptionUserId}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{formatDate(row.billingDate)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Failed Webhook Events</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-stone-500 dark:text-stone-400">
                                <th className="py-2 pr-4">Provider</th>
                                <th className="py-2 pr-4">Event ID</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Processed At</th>
                                <th className="py-2 pr-4">Route</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.samples.failedWebhookEvents.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-stone-500 dark:text-stone-400" colSpan={5}>No failed webhook events detected.</td>
                                </tr>
                            ) : (
                                snapshot.samples.failedWebhookEvents.map((row) => (
                                    <tr key={`${row.provider}-${row.eventId}`} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.provider}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{row.eventId}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.status}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{formatDate(row.processedAt)}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{row.sourceRoute || "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
