export const runtime = 'nodejs'

import Link from "next/link"
import { db } from "@/lib/db"
import { formatEur } from "@/lib/pricing/pricing-view-model"

function euro(value: unknown): string {
    if (value == null) return "—"
    return formatEur(Number(value))
}

export default async function AdminPlansPage() {
    // Raw table read on purpose (not the cached catalog): the admin must see
    // exactly what is stored, including legacy rows and non-canonical shapes.
    const plans = await db.plan.findMany({
        orderBy: [{ planType: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    })

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-stone-100">Manage Plans</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">
                Prices, annual prices, trials, visibility and entitlement limits are live within
                ~5 minutes of saving (usually immediately). Price changes apply to <strong>new checkouts
                only</strong> — current subscribers keep the price they signed up at.
            </p>

            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700">
                            <th className="px-4 py-3 font-medium">Plan</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Tier key</th>
                            <th className="px-4 py-3 font-medium">Monthly</th>
                            <th className="px-4 py-3 font-medium">Annual</th>
                            <th className="px-4 py-3 font-medium">Trial</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">v</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                        {plans.map((plan) => (
                            <tr key={plan.id} className="text-stone-900 dark:text-stone-100">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{plan.displayName}</div>
                                    <div className="text-xs text-stone-500 dark:text-stone-400">{plan.id}</div>
                                </td>
                                <td className="px-4 py-3">{plan.planType}</td>
                                <td className="px-4 py-3">
                                    {plan.tierKey ?? (
                                        <span className="text-stone-400" title="Resolved from the plan name (legacy row)">
                                            (by name)
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">{euro(plan.price)}</td>
                                <td className="px-4 py-3">{euro(plan.annualPrice)}</td>
                                <td className="px-4 py-3">{plan.trialDays > 0 ? `${plan.trialDays}d` : "—"}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-primary-soft text-status-success dark:bg-primary/15' : 'bg-red-100 dark:bg-rose-900/40 text-red-700 dark:text-rose-200'}`}>
                                        {plan.isActive ? 'Active' : 'Retired'}
                                    </span>
                                    {!plan.isPublic && (
                                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                                            Hidden
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-stone-500 dark:text-stone-400">{plan.version}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/admin/plans/${plan.id}`}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
