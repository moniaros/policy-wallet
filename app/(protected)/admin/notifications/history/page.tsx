export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { channelLabel } from "@/lib/admin/notification-admin"
import { retryNotification } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

const STATUS_TONE: Record<string, string> = {
    sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    skipped: "bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400",
    expired: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    queued: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
}

const PAGE_SIZE = 50

/**
 * Delivery history: every attempt, with its outcome and the reason.
 *
 * Deliberately shows the notification's TITLE, not its body. An operator
 * debugging delivery needs to know which notification and what happened to it;
 * they do not need to read the customer's coverage findings, and an admin
 * screen is a poor place to put them.
 */
export default async function NotificationHistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; event?: string; channel?: string; page?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const { status, event, channel, page: pageParam } = await searchParams
    const page = Math.max(1, Number(pageParam) || 1)

    const where = {
        ...(status ? { status } : {}),
        ...(event ? { eventType: event } : {}),
        ...(channel ? { channel } : {}),
    }

    const [rows, total] = await Promise.all([
        db.notificationEvent.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
                id: true,
                eventType: true,
                channel: true,
                status: true,
                priority: true,
                title: true,
                attempts: true,
                failureReason: true,
                skipReason: true,
                createdAt: true,
                sentAt: true,
                readAt: true,
                nextAttemptAt: true,
                expiresAt: true,
                user: { select: { email: true } },
            },
        }),
        db.notificationEvent.count({ where }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const eventKeys = Object.keys(NOTIFICATION_EVENTS).sort()

    const filterHref = (patch: Record<string, string | undefined>) => {
        const next = new URLSearchParams()
        const merged = { status, event, channel, ...patch }
        for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
        return `/admin/notifications/history?${next.toString()}`
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                        Delivery history
                    </h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        {total.toLocaleString()} records. One row per channel per notification — that
                        is what makes &quot;the email went, the push did not&quot; visible.
                    </p>
                </div>
                <Link href="/admin/notifications" className="pw-btn pw-btn-sm">
                    Back to overview
                </Link>
            </div>

            {/* ── Filters ────────────────────────────────────────────────── */}
            <form method="GET" className={`${card} p-4 flex flex-wrap gap-3 items-end`}>
                <div>
                    <label htmlFor="status" className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                        Status
                    </label>
                    <select id="status" name="status" defaultValue={status ?? ""} className="pw-input pw-input-sm">
                        <option value="">Any</option>
                        {["sent", "failed", "skipped", "expired", "queued"].map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="event" className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                        Event
                    </label>
                    <select id="event" name="event" defaultValue={event ?? ""} className="pw-input pw-input-sm">
                        <option value="">Any</option>
                        {eventKeys.map((k) => (
                            <option key={k} value={k}>
                                {k}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="channel" className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                        Channel
                    </label>
                    <select id="channel" name="channel" defaultValue={channel ?? ""} className="pw-input pw-input-sm">
                        <option value="">Any</option>
                        {["in_app", "email", "push", "analytics"].map((c) => (
                            <option key={c} value={c}>
                                {channelLabel(c)}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="pw-btn pw-btn-sm">
                    Filter
                </button>
                {(status || event || channel) && (
                    <Link href="/admin/notifications/history" className="text-xs text-primary hover:underline">
                        Clear
                    </Link>
                )}
            </form>

            {/* ── Rows ───────────────────────────────────────────────────── */}
            <section className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-50 dark:bg-stone-900 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                            <tr>
                                <th className="text-left px-5 py-2 font-medium">When</th>
                                <th className="text-left px-3 py-2 font-medium">Event</th>
                                <th className="text-left px-3 py-2 font-medium">Recipient</th>
                                <th className="text-left px-3 py-2 font-medium">Channel</th>
                                <th className="text-left px-3 py-2 font-medium">Outcome</th>
                                <th className="text-right px-5 py-2 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-stone-500 dark:text-stone-400">
                                        No records match these filters.
                                    </td>
                                </tr>
                            )}
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    <td className="px-5 py-3 text-xs text-stone-600 dark:text-stone-400 whitespace-nowrap">
                                        {row.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                                    </td>
                                    <td className="px-3 py-3">
                                        <Link
                                            href={`/admin/notifications/triggers/${row.eventType}`}
                                            className="font-mono text-xs text-primary hover:underline"
                                        >
                                            {row.eventType}
                                        </Link>
                                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs truncate">
                                            {row.title}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-stone-600 dark:text-stone-400 max-w-[14rem] truncate">
                                        {row.user?.email ?? "—"}
                                    </td>
                                    <td className="px-3 py-3 text-xs text-stone-600 dark:text-stone-400">
                                        {channelLabel(row.channel)}
                                    </td>
                                    <td className="px-3 py-3">
                                        <span
                                            className={`text-xs rounded px-2 py-0.5 ${STATUS_TONE[row.status] ?? STATUS_TONE.queued}`}
                                        >
                                            {row.status}
                                        </span>
                                        {row.skipReason && (
                                            <div className="text-micro text-stone-500 dark:text-stone-400 mt-1">
                                                {row.skipReason}
                                            </div>
                                        )}
                                        {row.failureReason && (
                                            <div className="text-micro text-red-600 dark:text-red-400 mt-1 max-w-xs truncate">
                                                {row.failureReason}
                                            </div>
                                        )}
                                        {row.attempts > 1 && (
                                            <div className="text-micro text-stone-500 dark:text-stone-400 mt-1">
                                                {row.attempts} attempts
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {(row.status === "failed" || row.status === "expired") && (
                                            <form action={retryNotification} className="inline">
                                                <input type="hidden" name="notificationId" value={row.id} />
                                                <button type="submit" className="pw-btn pw-btn-sm">
                                                    Retry
                                                </button>
                                            </form>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        {page > 1 && (
                            <Link href={filterHref({ page: String(page - 1) })} className="pw-btn pw-btn-sm">
                                Previous
                            </Link>
                        )}
                        {page < totalPages && (
                            <Link href={filterHref({ page: String(page + 1) })} className="pw-btn pw-btn-sm">
                                Next
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
