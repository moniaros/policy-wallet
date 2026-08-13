export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { BUSINESS_EVENTS } from "@/lib/events/catalog"
import { FEATURE_FLAGS } from "@/lib/flags/registry"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { getNotificationConfig } from "@/lib/notifications/config"
import { settingValue } from "@/lib/notifications/settings"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * The automation console.
 *
 * One entry point for everything that decides what the product does on its own:
 * the facts it reacts to, the rules it applies, the copy it sends, the schedules
 * that drive it and the queues that carry it.
 *
 * These surfaces existed but were scattered across /admin/notifications and
 * /admin/ai, so an operator had to already know the architecture to find the
 * thing they wanted. A console you can only navigate if you built it is not a
 * console.
 *
 * Mobile-first: cards at every width. The audit noted the other admin tables
 * scroll horizontally on a phone — tolerable for a reference list, wrong for
 * the screen someone opens while a customer is on the phone.
 */
export default async function AutomationConsolePage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const since = new Date(Date.now() - 7 * 24 * 3600_000)

    const [
        config,
        pendingEvents,
        deadDeliveries,
        failedNotifications,
        deferredNotifications,
        pausedSchedules,
        failedRuns,
        templateCount,
        overrideCount,
        disabledEvents,
        overriddenFlags,
    ] = await Promise.all([
        getNotificationConfig(),
        db.businessEvent.count({ where: { dispatchState: "pending" } }),
        db.businessEventDelivery.count({ where: { status: "dead" } }),
        db.notificationEvent.count({ where: { status: "failed", createdAt: { gte: since } } }),
        db.notificationEvent.count({ where: { status: "queued", scheduledFor: { not: null } } }),
        db.jobSchedule.count({ where: { enabled: false } }),
        db.jobRun.count({ where: { status: "failed", startedAt: { gte: since } } }),
        db.notificationTemplate.count({ where: { isActive: true } }),
        db.notificationRuleOverride.count(),
        db.businessEventOverride.count({ where: { enabled: false } }),
        // "Overridden" means a row is actively taking control, which is not the
        // same as a row existing — a cleared override leaves both columns NULL.
        //
        // Falls back to 0 rather than throwing: this hub must not go down
        // because the flags table is not there yet. Code and migration deploy
        // separately here (the Prisma migrate CLI cannot reach this database —
        // DIRECT_URL is the transaction pooler), so there is a real window in
        // which one has landed and the other has not, in either order.
        db.featureFlag
            .count({ where: { OR: [{ enabled: { not: null } }, { rollout: { not: null } }] } })
            .catch(() => 0),
    ])

    const paused = settingValue<boolean>(config.settings, "automation.paused")
    const liveBusinessEvents = Object.values(BUSINESS_EVENTS).filter((e) => e.status === "live").length
    const liveNotifications = Object.values(NOTIFICATION_EVENTS).filter((e) => e.status === "live").length

    const sections = [
        {
            href: "/admin/automation/events",
            title: "Business events",
            blurb: "The facts the product reacts to. Enable, disable, inspect the catalog.",
            stat: `${liveBusinessEvents} live`,
            warn: disabledEvents > 0 ? `${disabledEvents} disabled` : null,
        },
        {
            href: "/admin/notifications/triggers",
            title: "Automation rules",
            blurb: "Priority, channels, retry, escalation and expiry — per notification.",
            stat: `${liveNotifications} triggers`,
            warn: overrideCount > 0 ? `${overrideCount} overridden` : null,
        },
        {
            href: "/admin/notifications/templates",
            title: "Templates",
            blurb: "Email, push and in-app copy, per language. Preview, test, clone, version.",
            stat: `${templateCount} active`,
            warn: null,
        },
        {
            href: "/admin/automation/localization",
            title: "Localization",
            blurb: "Which templates exist in which language — and which split the audience.",
            stat: "coverage",
            warn: null,
        },
        {
            href: "/admin/automation/schedules",
            title: "Schedules",
            blurb: "Every scheduled job, when it last ran, and whether it is paused.",
            stat: "17 jobs",
            warn: pausedSchedules > 0 ? `${pausedSchedules} paused` : failedRuns > 0 ? `${failedRuns} failed runs` : null,
        },
        {
            href: "/admin/automation/queues",
            title: "Queues",
            blurb: "Event outbox, delivery backlog, dead letters and deferred notifications.",
            stat: `${pendingEvents} pending`,
            warn: deadDeliveries > 0 ? `${deadDeliveries} dead` : null,
        },
        {
            href: "/admin/automation/analytics",
            title: "Analytics",
            blurb: "Delivery outcomes by channel, event and day.",
            stat: "7 days",
            warn: failedNotifications > 0 ? `${failedNotifications} failures` : null,
        },
        {
            href: "/admin/notifications/workflows",
            title: "Automation logs",
            blurb: "Event → decision → actions, including what was deliberately not done.",
            stat: "recent",
            warn: null,
        },
        {
            href: "/admin/notifications/history",
            title: "Notification history",
            blurb: "Every delivery attempt, its outcome and its reason. Retry from here.",
            stat: "all channels",
            warn: null,
        },
        {
            href: "/admin/automation/flags",
            title: "Feature flags",
            blurb: "Switches that take effect without a deploy. Falls back to the environment.",
            stat: `${Object.keys(FEATURE_FLAGS).length} declared`,
            warn: overriddenFlags > 0 ? `${overriddenFlags} overridden` : null,
        },
        {
            href: "/admin/notifications",
            // Was titled "Feature flags & settings", which is what sent someone
            // looking for a flag to a page that has none. These are the global
            // notification settings; the flags are the card above.
            title: "Notification settings",
            blurb: "Global pause, channel toggles, thresholds, quiet hours, caps.",
            stat: "global",
            warn: paused ? "paused" : null,
        },
        {
            href: "/admin/ai/prompts",
            title: "AI rules",
            blurb: "Operator guidance appended to the extraction and analysis prompts.",
            stat: "prompts",
            warn: null,
        },
        {
            href: "/admin/gaps",
            title: "Coverage gap rules",
            blurb: "Gap definitions and their severity.",
            stat: "definitions",
            warn: null,
        },
    ]

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Automation</h1>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                    Everything that decides what the product does on its own.
                </p>
            </div>

            {paused && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                    <strong>All automations are paused.</strong> Events are still recorded and
                    notifications are still written — with a reason of{" "}
                    <code className="text-xs">automations_paused</code> — so what was withheld stays
                    visible. Nothing is being delivered.
                </div>
            )}

            {/* Health strip — the four numbers worth seeing before anything else. */}
            <section className={`${card} p-4 sm:p-5`}>
                <h2 className="font-semibold text-stone-900 dark:text-white">Right now</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {[
                        { label: "Events awaiting dispatch", value: pendingEvents, bad: pendingEvents > 100 },
                        { label: "Dead deliveries", value: deadDeliveries, bad: deadDeliveries > 0 },
                        { label: "Failed sends (7d)", value: failedNotifications, bad: failedNotifications > 0 },
                        { label: "Deferred", value: deferredNotifications, bad: false },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3">
                            <div
                                className={`text-2xl font-bold ${
                                    stat.bad
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-stone-900 dark:text-white"
                                }`}
                            >
                                {stat.value}
                            </div>
                            <div className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
                    Deferred is not a problem — those are notifications held for quiet hours or a
                    daily cap, and they will send. Dead deliveries are: they have exhausted their
                    retries and need a person.
                </p>
            </section>

            {/* Sections — cards, not a table, at every width. */}
            <div className="grid gap-3 sm:grid-cols-2">
                {sections.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className={`${card} p-4 hover:border-stone-300 dark:hover:border-stone-600 transition-colors block`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-stone-900 dark:text-white">
                                {section.title}
                            </h3>
                            <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                                {section.warn && (
                                    <span className="text-kicker rounded px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                        {section.warn}
                                    </span>
                                )}
                                <span className="text-kicker rounded px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                                    {section.stat}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">
                            {section.blurb}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    )
}
