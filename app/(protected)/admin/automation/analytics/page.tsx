export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { channelLabel } from "@/lib/admin/notification-admin"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * Delivery analytics.
 *
 * Deliberately reports SENT against everything else rather than a single
 * "success rate": a skip is not a failure, and averaging them together produces
 * a number that falls when customers exercise their preferences — which would
 * read as the system getting worse while it is behaving exactly as asked.
 */
export default async function AnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ days?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const { days: daysParam } = await searchParams
    const days = Math.min(Math.max(Number(daysParam) || 7, 1), 90)
    const since = new Date(Date.now() - days * 24 * 3600_000)

    const [byChannel, byStatus, byEvent, bySkip] = await Promise.all([
        db.notificationEvent.groupBy({
            by: ["channel", "status"],
            where: { createdAt: { gte: since }, channel: { not: "analytics" } },
            _count: { _all: true },
        }),
        db.notificationEvent.groupBy({
            by: ["status"],
            where: { createdAt: { gte: since }, channel: { not: "analytics" } },
            _count: { _all: true },
        }),
        db.notificationEvent.groupBy({
            by: ["eventType", "status"],
            where: { createdAt: { gte: since }, channel: { not: "analytics" } },
            _count: { _all: true },
        }),
        db.notificationEvent.groupBy({
            by: ["skipReason"],
            where: { createdAt: { gte: since }, status: "skipped" },
            _count: { _all: true },
        }),
    ])

    const total = byStatus.reduce((sum, r) => sum + r._count._all, 0)
    const statusCount = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0

    const channels = [...new Set(byChannel.map((r) => r.channel))].sort()
    const channelRows = channels.map((channel) => {
        const rows = byChannel.filter((r) => r.channel === channel)
        const count = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0
        const all = rows.reduce((sum, r) => sum + r._count._all, 0)
        return { channel, sent: count("sent"), failed: count("failed"), skipped: count("skipped"), queued: count("queued"), all }
    })

    const eventTotals = new Map<string, { sent: number; failed: number; all: number }>()
    for (const row of byEvent) {
        const entry = eventTotals.get(row.eventType) ?? { sent: 0, failed: 0, all: 0 }
        entry.all += row._count._all
        if (row.status === "sent") entry.sent += row._count._all
        if (row.status === "failed") entry.failed += row._count._all
        eventTotals.set(row.eventType, entry)
    }
    const topEvents = [...eventTotals.entries()].sort((a, b) => b[1].all - a[1].all).slice(0, 12)

    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

    return (
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Last {days} days · {total.toLocaleString()} delivery records
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {[7, 30, 90].map((d) => (
                        <Link
                            key={d}
                            href={`/admin/automation/analytics?days=${d}`}
                            className={`text-xs rounded-full px-3 py-1.5 font-medium ${
                                d === days
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                            }`}
                        >
                            {d}d
                        </Link>
                    ))}
                    <Link href="/admin/automation" className="pw-btn pw-btn-sm">Automation</Link>
                </div>
            </div>

            <section className={`${card} p-4`}>
                <h2 className="font-semibold text-stone-900 dark:text-white">Outcomes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {[
                        { label: "Sent", value: statusCount("sent"), tone: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Skipped", value: statusCount("skipped"), tone: "text-stone-600 dark:text-stone-400" },
                        { label: "Failed", value: statusCount("failed"), tone: "text-red-600 dark:text-red-400" },
                        { label: "Deferred", value: statusCount("queued"), tone: "text-blue-600 dark:text-blue-400" },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3">
                            <div className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</div>
                            <div className="text-xs text-stone-500 dark:text-stone-400">
                                {stat.label} · {pct(stat.value)}%
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
                    Reported separately on purpose. A skip means we honoured a preference or had
                    nobody to reach; folding it into a success rate would make the number fall as
                    customers exercise their choices.
                </p>
            </section>

            <section className={`${card} p-4`}>
                <h2 className="font-semibold text-stone-900 dark:text-white mb-3">By channel</h2>
                <div className="space-y-3">
                    {channelRows.map((row) => (
                        <div key={row.channel}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-stone-900 dark:text-white">{channelLabel(row.channel)}</span>
                                <span className="text-xs text-stone-500 dark:text-stone-400">
                                    {row.sent} sent · {row.skipped} skipped
                                    {row.failed > 0 && <span className="text-red-600 dark:text-red-400"> · {row.failed} failed</span>}
                                </span>
                            </div>
                            {/* A stacked bar rather than a percentage: the shape of
                                the mix is the information, not one ratio. */}
                            <div className="mt-1 flex h-2 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-900">
                                {[
                                    { n: row.sent, cls: "bg-emerald-500" },
                                    { n: row.queued, cls: "bg-blue-400" },
                                    { n: row.skipped, cls: "bg-stone-400" },
                                    { n: row.failed, cls: "bg-red-500" },
                                ].map((seg, i) =>
                                    seg.n === 0 ? null : (
                                        <div
                                            key={i}
                                            className={seg.cls}
                                            style={{ width: `${(seg.n / Math.max(row.all, 1)) * 100}%` }}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                    {channelRows.length === 0 && (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No deliveries in this window.</p>
                    )}
                </div>
            </section>

            {bySkip.length > 0 && (
                <section className={`${card} p-4`}>
                    <h2 className="font-semibold text-stone-900 dark:text-white mb-2">Why deliveries were skipped</h2>
                    <div className="flex flex-wrap gap-2">
                        {bySkip.map((r) => (
                            <span
                                key={r.skipReason ?? "unknown"}
                                className="text-xs rounded-full bg-stone-100 dark:bg-stone-900 px-3 py-1 text-stone-700 dark:text-stone-300"
                            >
                                {r.skipReason ?? "unspecified"}: <strong>{r._count._all}</strong>
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <section className={`${card} p-4`}>
                <h2 className="font-semibold text-stone-900 dark:text-white mb-3">Busiest events</h2>
                <ul className="space-y-2">
                    {topEvents.map(([event, stats]) => (
                        <li key={event} className="flex items-center justify-between gap-2 flex-wrap">
                            <Link
                                href={`/admin/notifications/history?event=${event}`}
                                className="font-mono text-xs text-primary hover:underline break-all"
                            >
                                {event}
                            </Link>
                            <span className="text-xs text-stone-600 dark:text-stone-400 shrink-0">
                                {stats.all}
                                {stats.failed > 0 && (
                                    <span className="text-red-600 dark:text-red-400"> · {stats.failed} failed</span>
                                )}
                            </span>
                        </li>
                    ))}
                    {topEvents.length === 0 && (
                        <li className="text-sm text-stone-500 dark:text-stone-400">Nothing in this window.</li>
                    )}
                </ul>
            </section>
        </div>
    )
}
