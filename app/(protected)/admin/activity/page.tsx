export const runtime = "nodejs"

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getActivityLogs } from "../actions"
import { formatDateTime } from "@/lib/i18n/format"
import { hasAnyRole } from "@/lib/api-auth"

export default async function AdminActivityPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; scope?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    // Substring matching on the comma-separated roles string is banned by
    // CLAUDE.md for exactly the reason it looks harmless: it matches any role
    // that merely CONTAINS "admin".
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }

    const { page, scope: scopeParam } = await searchParams
    const pageNum = Math.max(1, Number(page) || 1)
    const scope: "admin" | "all" = scopeParam === "all" ? "all" : "admin"
    const { logs, pagination } = await getActivityLogs(pageNum, 25, scope)

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                    {scope === "admin" ? "Admin Activity Log" : "All Activity"}
                </h1>
                <p className="text-stone-600 dark:text-stone-400 mt-2">
                    {scope === "admin"
                        ? "Administrator actions only, most recent first."
                        : "Every logged event, including customer activity, most recent first."}{" "}
                    {pagination.total.toLocaleString()} total.
                </p>
                <p className="mt-3 flex gap-3 text-sm">
                    <Link
                        href="/admin/activity"
                        className={scope === "admin" ? "font-bold underline" : "text-stone-500 hover:underline"}
                    >
                        Admin actions
                    </Link>
                    <Link
                        href="/admin/activity?scope=all"
                        className={scope === "all" ? "font-bold underline" : "text-stone-500 hover:underline"}
                    >
                        All activity
                    </Link>
                </p>
            </div>

            <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700">
                            <th className="py-2 px-4">When</th>
                            <th className="py-2 px-4">Admin</th>
                            <th className="py-2 px-4">Action</th>
                            <th className="py-2 px-4">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr><td className="py-6 px-4 text-stone-500 dark:text-stone-400" colSpan={4}>No activity recorded.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="border-b border-stone-100 dark:border-stone-700 align-top">
                                    <td className="py-2 px-4 text-stone-600 dark:text-stone-400 whitespace-nowrap">{formatDateTime(log.timestamp, 'en')}</td>
                                    <td className="py-2 px-4 text-stone-900 dark:text-stone-100">{log.adminEmail}</td>
                                    <td className="py-2 px-4"><span className="font-mono text-xs bg-stone-100 dark:bg-stone-700 rounded px-2 py-1">{log.actionType}</span></td>
                                    <td className="py-2 px-4 text-stone-700 dark:text-stone-300">{log.description}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">Page {pagination.page} of {pagination.totalPages}</span>
                    <div className="flex gap-2">
                        {pagination.page > 1 && (
                            <Link href={`/admin/activity?page=${pagination.page - 1}`} className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700">Previous</Link>
                        )}
                        {pagination.page < pagination.totalPages && (
                            <Link href={`/admin/activity?page=${pagination.page + 1}`} className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700">Next</Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
