export const runtime = "nodejs"

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getUserDetails } from "../../actions"
import GrantTokensButton from "@/components/admin/GrantTokensButton"
import { formatDateTime } from "@/lib/i18n/format"

function fmt(v: Date | string | null | undefined) {
    if (!v) return "-"
    return formatDateTime(v, 'en')
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
            <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <h2 className="font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </section>
    )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">{label}</div>
            <div className="text-stone-900 dark:text-stone-100 break-all">{value ?? "-"}</div>
        </div>
    )
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { dbUser } = await getAuthenticatedUser()
    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const { id } = await params

    let user: Awaited<ReturnType<typeof getUserDetails>> | null = null
    try {
        user = await getUserDetails(id)
    } catch {
        return (
            <div className="max-w-3xl mx-auto px-4 py-10">
                <Link href="/admin/users" className="text-primary dark:text-mint text-sm">← Back to users</Link>
                <p className="mt-6 text-stone-600 dark:text-stone-400">User not found.</p>
            </div>
        )
    }

    const balance = user.tokenBalance
    const purchased = balance ? Number(balance.purchasedTokens) : 0
    const used = balance ? Number(balance.usedTokens) : 0
    const available = purchased - used

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div>
                <Link href="/admin/users" className="text-primary dark:text-mint text-sm">← Back to users</Link>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mt-2">
                    {user.name || user.email}
                </h1>
                <p className="text-stone-600 dark:text-stone-400">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {user.roles.split(",").map((r) => (
                        <span key={r} className="inline-flex px-2 py-1 text-xs font-medium rounded bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300">{r.trim()}</span>
                    ))}
                </div>
            </div>

            <Card title="Profile">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <Field label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
                    <Field label="Phone" value={user.phoneNumber} />
                    <Field label="Tax ID (ΑΦΜ)" value={user.taxId} />
                    <Field label="Language" value={user.preferredLanguage} />
                    <Field label="Email verified" value={user.emailVerified ? fmt(user.emailVerified) : "No"} />
                    <Field label="Joined" value={fmt(user.createdAt)} />
                    <Field label="Last active" value={fmt(user.lastActiveAt)} />
                    <Field label="Stripe customer" value={user.stripeCustomerId ? <span className="font-mono text-xs">{user.stripeCustomerId}</span> : "-"} />
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Token balance" action={<GrantTokensButton userId={user.id} label={user.email} />}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <Field label="Available" value={<span className="text-lg font-bold">{available.toLocaleString()}</span>} />
                        <Field label="Purchased" value={purchased.toLocaleString()} />
                        <Field label="Used" value={used.toLocaleString()} />
                    </div>
                    {balance?.lastPurchaseAt && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">Last credited {fmt(balance.lastPurchaseAt)}</p>
                    )}
                </Card>

                <Card title="Subscriptions">
                    {user.subscriptions.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No subscriptions.</p>
                    ) : (
                        <div className="space-y-3">
                            {user.subscriptions.map((s) => (
                                <div key={s.id} className="text-sm border-b border-stone-100 dark:border-stone-700 pb-2 last:border-none">
                                    <div className="font-medium text-stone-900 dark:text-stone-100">
                                        {s.plan?.displayName || s.plan?.name || s.planId} · {s.status}
                                    </div>
                                    <div className="text-xs text-stone-500 dark:text-stone-400">
                                        {s.provider} · renews {fmt(s.currentPeriodEnd)}
                                        {s.stripeSubscriptionId ? ` · ${s.stripeSubscriptionId}` : ""}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Card title="Recent policies">
                {user.policiesOwned.length === 0 ? (
                    <p className="text-sm text-stone-500 dark:text-stone-400">No policies.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-stone-500 dark:text-stone-400">
                                    <th className="py-2 pr-4">Policy #</th><th className="py-2 pr-4">Insurer</th>
                                    <th className="py-2 pr-4">Line</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.policiesOwned.map((p) => (
                                    <tr key={p.id} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{p.policyNumber}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{p.insurerName}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{p.lineOfBusiness}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{p.status}</td>
                                        <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">{fmt(p.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card title="Recent billing events">
                {user.invoices.length === 0 ? (
                    <p className="text-sm text-stone-500 dark:text-stone-400">No invoices.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-stone-500 dark:text-stone-400">
                                    <th className="py-2 pr-4">Invoice</th><th className="py-2 pr-4">Total</th>
                                    <th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Billed</th><th className="py-2 pr-4">Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.invoices.map((inv) => (
                                    <tr key={inv.id} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4 font-mono text-xs text-stone-900 dark:text-stone-100">{inv.invoiceNumber}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{Number(inv.totalAmount).toFixed(2)} {inv.currency}</td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{inv.status}</td>
                                        <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">{fmt(inv.billingDate)}</td>
                                        <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">{fmt(inv.paidAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Active sessions">
                    {user.activeSessions.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No active sessions.</p>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {user.activeSessions.map((s) => (
                                <li key={s.id} className="text-stone-700 dark:text-stone-300">
                                    {s.deviceName} ({s.deviceType}) · {s.ipAddress}
                                    <span className="text-xs text-stone-500 dark:text-stone-400"> · {fmt(s.lastActiveAt)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Recent security events">
                    {user.securityEvents.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No security events.</p>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {user.securityEvents.map((e) => (
                                <li key={e.id} className="text-stone-700 dark:text-stone-300">
                                    {e.eventType}
                                    <span className="text-xs text-stone-500 dark:text-stone-400"> · {e.ipAddress || "?"} · {fmt(e.createdAt)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    )
}
