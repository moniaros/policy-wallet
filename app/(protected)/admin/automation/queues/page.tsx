export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * The four queues the product runs on.
 *
 * Depth alone is not health — a queue with a hundred pending items that drains
 * every hour is fine, and one with three that has not moved since Tuesday is
 * not. So each queue reports its OLDEST waiting item as well as its size: age is
 * what distinguishes a busy queue from a stuck one.
 */
export default async function QueuesPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const now = Date.now()

    const [
        pendingEvents, oldestEvent,
        pendingDeliveries, oldestDelivery, deadDeliveries,
        deferredNotifications, oldestDeferred,
        failedNotifications, oldestFailed,
        queuedAnalyses, oldestAnalysis,
    ] = await Promise.all([
        db.businessEvent.count({ where: { dispatchState: "pending" } }),
        db.businessEvent.findFirst({ where: { dispatchState: "pending" }, orderBy: { recordedAt: "asc" }, select: { recordedAt: true } }),
        db.businessEventDelivery.count({ where: { status: { in: ["pending", "failed"] } } }),
        db.businessEventDelivery.findFirst({ where: { status: { in: ["pending", "failed"] } }, orderBy: { nextAttemptAt: "asc" }, select: { nextAttemptAt: true } }),
        db.businessEventDelivery.count({ where: { status: "dead" } }),
        db.notificationEvent.count({ where: { status: "queued", scheduledFor: { not: null } } }),
        db.notificationEvent.findFirst({ where: { status: "queued", scheduledFor: { not: null } }, orderBy: { scheduledFor: "asc" }, select: { scheduledFor: true } }),
        db.notificationEvent.count({ where: { status: "failed" } }),
        db.notificationEvent.findFirst({ where: { status: "failed" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        db.policyAnalysisRun.count({ where: { status: { in: ["queued", "running"] } } }),
        db.policyAnalysisRun.findFirst({ where: { status: { in: ["queued", "running"] } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    ])

    const age = (at: Date | null | undefined) => {
        if (!at) return null
        const hours = (now - at.getTime()) / 3600_000
        if (hours < 1) return `${Math.round(hours * 60)}m`
        if (hours < 48) return `${Math.round(hours)}h`
        return `${Math.round(hours / 24)}d`
    }

    const queues = [
        {
            name: "Event outbox",
            blurb: "Business facts published but not yet dispatched to subscribers.",
            depth: pendingEvents,
            oldest: age(oldestEvent?.recordedAt),
            stuckAfterHours: 2,
            href: "/admin/notifications/workflows",
        },
        {
            name: "Event deliveries",
            blurb: "Decision-engine runs waiting or retrying.",
            depth: pendingDeliveries,
            oldest: age(oldestDelivery?.nextAttemptAt),
            stuckAfterHours: 6,
            href: "/admin/notifications/workflows",
            dead: deadDeliveries,
        },
        {
            name: "Deferred notifications",
            blurb: "Held for quiet hours or a daily cap. These are not a problem — they will send.",
            depth: deferredNotifications,
            oldest: age(oldestDeferred?.scheduledFor),
            // A deferral can legitimately wait overnight; only a multi-day wait
            // means something stopped picking them up.
            stuckAfterHours: 36,
            href: "/admin/notifications/history?status=queued",
        },
        {
            name: "Failed notifications",
            blurb: "Awaiting retry, or exhausted and needing a person.",
            depth: failedNotifications,
            oldest: age(oldestFailed?.createdAt),
            stuckAfterHours: 24,
            href: "/admin/notifications/history?status=failed",
        },
        {
            name: "Policy analysis",
            blurb: "Uploads queued or being read by the AI pipeline.",
            depth: queuedAnalyses,
            oldest: age(oldestAnalysis?.createdAt),
            stuckAfterHours: 2,
            href: "/admin/extraction-flags",
        },
    ]

    return (
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Queues</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Depth is not health. The age of the oldest waiting item is what tells a busy
                        queue from a stuck one.
                    </p>
                </div>
                <Link href="/admin/automation" className="pw-btn pw-btn-sm">Automation</Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {queues.map((queue) => {
                    const stuck =
                        queue.oldest != null &&
                        (queue.oldest.endsWith("d") ||
                            (queue.oldest.endsWith("h") && Number(queue.oldest.slice(0, -1)) >= queue.stuckAfterHours))
                    return (
                        <article key={queue.name} className={`${card} p-4`}>
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="font-semibold text-stone-900 dark:text-white">{queue.name}</h2>
                                <div
                                    className={`text-2xl font-bold shrink-0 ${
                                        stuck ? "text-amber-600 dark:text-amber-400" : "text-stone-900 dark:text-white"
                                    }`}
                                >
                                    {queue.depth}
                                </div>
                            </div>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{queue.blurb}</p>

                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                <span className="text-xs text-stone-600 dark:text-stone-400">
                                    Oldest: <strong>{queue.oldest ?? "—"}</strong>
                                </span>
                                {stuck && (
                                    <span className="text-kicker rounded px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                        waiting longer than expected
                                    </span>
                                )}
                                {queue.dead != null && queue.dead > 0 && (
                                    <span className="text-kicker rounded px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                                        {queue.dead} dead
                                    </span>
                                )}
                            </div>

                            <Link href={queue.href} className="pw-btn pw-btn-sm mt-3 inline-block">
                                Inspect
                            </Link>
                        </article>
                    )
                })}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
                Dead deliveries have exhausted their retries. They do not resolve on their own.
            </p>
        </div>
    )
}
