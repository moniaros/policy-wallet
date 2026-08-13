export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { getNotificationConfig } from "@/lib/notifications/config"
import { NOTIFICATION_SETTINGS, settingValue } from "@/lib/notifications/settings"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { saveSettings, runRetrySweepNow } from "./actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

const GROUP_TITLES: Record<string, string> = {
    automation: "Automation",
    channels: "Channels",
    thresholds: "Thresholds",
    flags: "Feature flags",
}

const GROUP_BLURB: Record<string, string> = {
    automation: "The kill switches. Pausing records what did not go out, so a paused system is never mistaken for a broken one.",
    channels: "Global on/off per delivery channel. A channel switched off records `channel_disabled` rather than sending.",
    thresholds: "How much has to change before a customer hears from us. These are editorial judgements, not constants.",
    flags: "Safety switches for the admin layer itself.",
}

/**
 * Notification operations overview: queue health, delivery outcomes, and the
 * global settings that govern the whole bus.
 *
 * The health numbers are deliberately the honest ones — `skipped` is broken out
 * by REASON, because "we did not send this" covers a suppressed preference, a
 * disabled channel and a missing device, and treating those as one number is
 * how an operator concludes the system is broken when it is behaving exactly as
 * configured.
 */
export default async function NotificationAdminPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")
    const { saved } = await searchParams

    const config = await getNotificationConfig()
    const since = new Date(Date.now() - 7 * 24 * 3600_000)

    const [byStatus, bySkipReason, failing, overrideCount, templateCount, queued] = await Promise.all([
        db.notificationEvent.groupBy({
            by: ["status"],
            where: { createdAt: { gte: since }, channel: { not: "analytics" } },
            _count: { _all: true },
        }),
        db.notificationEvent.groupBy({
            by: ["skipReason"],
            where: { createdAt: { gte: since }, status: "skipped" },
            _count: { _all: true },
        }),
        db.notificationEvent.groupBy({
            by: ["eventType"],
            where: { createdAt: { gte: since }, status: "failed" },
            _count: { _all: true },
            orderBy: { _count: { eventType: "desc" } },
            take: 5,
        }),
        db.notificationRuleOverride.count(),
        db.notificationTemplate.count({ where: { isActive: true } }),
        db.notificationEvent.count({
            where: { status: "failed", nextAttemptAt: { not: null, lte: new Date() } },
        }),
    ])

    const statusCount = (status: string) =>
        byStatus.find((r) => r.status === status)?._count._all ?? 0

    const paused = settingValue<boolean>(config.settings, "automation.paused")
    const disabledTriggers = Object.values(config.events).filter((e) => !e.enabled).length
    const liveEvents = Object.values(NOTIFICATION_EVENTS).filter((e) => e.status === "live").length

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Notifications</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Every trigger, template and delivery. Rules here override the code defaults in{" "}
                        <code className="text-xs">lib/notifications/registry.ts</code> without a deploy.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/admin/notifications/triggers" className="pw-btn pw-btn-sm">
                        Triggers
                    </Link>
                    <Link href="/admin/notifications/templates" className="pw-btn pw-btn-sm">
                        Templates
                    </Link>
                    <Link href="/admin/notifications/history" className="pw-btn pw-btn-sm">
                        History
                    </Link>
                    <Link href="/admin/notifications/workflows" className="pw-btn pw-btn-sm">
                        Workflows
                    </Link>
                </div>
            </div>

            {saved && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                    Settings saved. They apply to the next notification.
                </div>
            )}

            {config.degraded && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <strong>Serving code defaults.</strong> The configuration could not be read from
                    the database, so every event is running on its registry default. Notifications are
                    still being sent — this is the designed degradation, not an outage — but nothing
                    you change here is in effect until the database is reachable.
                </div>
            )}

            {paused && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                    <strong>All automations are paused.</strong> No notification is being delivered on
                    any channel. Events are still recorded, with a reason of{" "}
                    <code className="text-xs">automations_paused</code>, so you can see exactly what
                    was withheld while this was on.
                </div>
            )}

            {/* ── Health ─────────────────────────────────────────────────── */}
            <section className={`${card} p-5`}>
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <h2 className="font-semibold text-stone-900 dark:text-white">Last 7 days</h2>
                    <form action={runRetrySweepNow}>
                        <button type="submit" className="pw-btn pw-btn-sm">
                            Run retry sweep now
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                    {[
                        { label: "Sent", value: statusCount("sent"), tone: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Failed", value: statusCount("failed"), tone: "text-red-600 dark:text-red-400" },
                        { label: "Skipped", value: statusCount("skipped"), tone: "text-stone-600 dark:text-stone-400" },
                        { label: "Expired", value: statusCount("expired"), tone: "text-amber-600 dark:text-amber-400" },
                        { label: "Due for retry", value: queued, tone: "text-blue-600 dark:text-blue-400" },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3">
                            <div className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</div>
                            <div className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {bySkipReason.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
                            Why deliveries were skipped
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {bySkipReason.map((r) => (
                                <span
                                    key={r.skipReason ?? "unknown"}
                                    className="text-xs rounded-full bg-stone-100 dark:bg-stone-900 px-3 py-1 text-stone-700 dark:text-stone-300"
                                >
                                    {r.skipReason ?? "unspecified"}: <strong>{r._count._all}</strong>
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                            A skip is not a failure. `preference_off` means we honoured a customer&apos;s
                            choice; `no_device` means they have not enabled push. Only{" "}
                            <code>failed</code> above means we tried and could not.
                        </p>
                    </div>
                )}

                {failing.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
                            Most failures
                        </h3>
                        <ul className="text-sm space-y-1">
                            {failing.map((f) => (
                                <li key={f.eventType} className="flex justify-between">
                                    <Link
                                        href={`/admin/notifications/history?event=${f.eventType}&status=failed`}
                                        className="text-primary hover:underline font-mono text-xs"
                                    >
                                        {f.eventType}
                                    </Link>
                                    <span className="text-stone-600 dark:text-stone-400">{f._count._all}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {/* ── Configuration summary ──────────────────────────────────── */}
            <section className={`${card} p-5`}>
                <h2 className="font-semibold text-stone-900 dark:text-white">Configuration</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                    <div>
                        <div className="text-2xl font-bold text-stone-900 dark:text-white">{liveEvents}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">live triggers</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-stone-900 dark:text-white">{overrideCount}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">with an override</div>
                    </div>
                    <div>
                        <div className={`text-2xl font-bold ${disabledTriggers > 0 ? "text-amber-600 dark:text-amber-400" : "text-stone-900 dark:text-white"}`}>
                            {disabledTriggers}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">switched off</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-stone-900 dark:text-white">{templateCount}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">active templates</div>
                    </div>
                </div>
            </section>

            {/* ── Settings ───────────────────────────────────────────────── */}
            <form action={saveSettings} className={`${card} p-5 space-y-6`}>
                <div>
                    <h2 className="font-semibold text-stone-900 dark:text-white">Global settings</h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Defaults are what the code ships with. An empty settings table behaves exactly
                        as the registry describes.
                    </p>
                </div>

                {(["automation", "channels", "thresholds", "flags"] as const).map((group) => (
                    // Anchored so the automation hub can link straight to a
                    // group — "protection score rules" is a thing an operator
                    // looks for by name, not by remembering it lives under
                    // notification settings.
                    <div key={group} id={group} className="scroll-mt-4">
                        <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
                            {GROUP_TITLES[group]}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">{GROUP_BLURB[group]}</p>
                        <div className="space-y-3">
                            {NOTIFICATION_SETTINGS.filter((s) => s.group === group).map((setting) => {
                                const current = config.settings[setting.key] ?? setting.default
                                const isDangerous =
                                    (setting.dangerousWhen === "true" && current === true) ||
                                    (setting.dangerousWhen === "false" && current === false)
                                return (
                                    <div
                                        key={setting.key}
                                        className={`flex items-start justify-between gap-4 rounded-lg p-3 ${
                                            isDangerous
                                                ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                                                : "bg-stone-50 dark:bg-stone-900"
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <label
                                                htmlFor={`setting.${setting.key}`}
                                                className="text-sm font-medium text-stone-900 dark:text-white"
                                            >
                                                {setting.label.en}
                                            </label>
                                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                {setting.description.en}
                                            </p>
                                            <code className="text-kicker text-stone-500 dark:text-stone-400">{setting.key}</code>
                                        </div>
                                        {setting.type === "boolean" ? (
                                            <input
                                                id={`setting.${setting.key}`}
                                                name={`setting.${setting.key}`}
                                                type="checkbox"
                                                defaultChecked={current === true}
                                                className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
                                            />
                                        ) : (
                                            <div className="shrink-0 text-right">
                                                <input
                                                    id={`setting.${setting.key}`}
                                                    name={`setting.${setting.key}`}
                                                    type="number"
                                                    defaultValue={String(current)}
                                                    min={setting.min}
                                                    max={setting.max}
                                                    className="pw-input pw-input-sm w-24 text-right"
                                                />
                                                {setting.unit && (
                                                    <div className="text-kicker text-stone-500 dark:text-stone-400 mt-1">{setting.unit}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}

                <button type="submit" className="pw-btn">
                    Save settings
                </button>
            </form>
        </div>
    )
}
