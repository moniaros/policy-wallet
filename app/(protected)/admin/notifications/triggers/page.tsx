export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { getNotificationConfig } from "@/lib/notifications/config"
import { channelLabel, describeExpiry, describeRetry } from "@/lib/admin/notification-admin"
import { toggleTrigger } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

const CATEGORY_ORDER = [
    "risk",
    "policy",
    "advisory",
    "billing",
    "security",
    "engagement",
    "admin",
    "analytics",
] as const

const CATEGORY_TITLES: Record<string, string> = {
    risk: "Risk, gaps, score and recommendations",
    policy: "Policy lifecycle and renewals",
    advisory: "Advisor collaboration",
    billing: "Billing and subscription",
    security: "Security",
    engagement: "Engagement",
    admin: "Administrative and escalation",
    analytics: "Analytics mirror (recorded, never delivered)",
}

const PRIORITY_TONE: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    high: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    normal: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
    low: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-400",
}

/**
 * Every trigger the product can fire, with its effective rules.
 *
 * "Effective" is the important word: what is shown is the registry default with
 * any override merged on top, because that is what actually reaches a customer.
 * A console showing the code default while the database says otherwise would be
 * worse than no console.
 */
export default async function TriggersPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const config = await getNotificationConfig()
    const events = Object.entries(config.events)

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Triggers</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        {events.length} business events. Values shown are <strong>effective</strong> —
                        registry default with any override applied.
                    </p>
                </div>
                <Link href="/admin/notifications" className="pw-btn pw-btn-sm">
                    Back to overview
                </Link>
            </div>

            {CATEGORY_ORDER.map((category) => {
                const rows = events.filter(([, e]) => e.category === category)
                if (rows.length === 0) return null

                return (
                    <section key={category} className={`${card} overflow-hidden`}>
                        <h2 className="px-5 py-3 font-semibold text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-700">
                            {CATEGORY_TITLES[category]}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-stone-50 dark:bg-stone-900 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                    <tr>
                                        <th className="text-left px-5 py-2 font-medium">Event</th>
                                        <th className="text-left px-3 py-2 font-medium">Priority</th>
                                        <th className="text-left px-3 py-2 font-medium">Channels</th>
                                        <th className="text-left px-3 py-2 font-medium">Retry</th>
                                        <th className="text-left px-3 py-2 font-medium">Expires</th>
                                        <th className="text-right px-5 py-2 font-medium">State</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                                    {rows.map(([key, event]) => (
                                        <tr key={key} className={event.enabled ? "" : "opacity-60"}>
                                            <td className="px-5 py-3">
                                                <Link
                                                    href={`/admin/notifications/triggers/${key}`}
                                                    className="font-mono text-xs text-primary hover:underline"
                                                >
                                                    {key}
                                                </Link>
                                                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                    {event.businessEvent}
                                                </div>
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {event.status === "planned" && (
                                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                                                            planned — no emitter yet
                                                        </span>
                                                    )}
                                                    {event.transactional && (
                                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                            transactional
                                                        </span>
                                                    )}
                                                    {event.overridden && (
                                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                                            overridden: {event.overriddenFields.join(", ")}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`text-xs rounded px-2 py-0.5 ${PRIORITY_TONE[event.priority]}`}
                                                >
                                                    {event.priority}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-stone-600 dark:text-stone-400">
                                                {event.channels.map(channelLabel).join(", ")}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-stone-600 dark:text-stone-400">
                                                {describeRetry(event.retry)}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-stone-600 dark:text-stone-400">
                                                {describeExpiry(event.expiresAfterHours)}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {event.transactional ? (
                                                    <span
                                                        className="text-xs text-stone-400"
                                                        title="Transactional events cannot be switched off — a customer never agreed to stop being told about this."
                                                    >
                                                        always on
                                                    </span>
                                                ) : (
                                                    <form action={toggleTrigger} className="inline">
                                                        <input type="hidden" name="eventType" value={key} />
                                                        <input
                                                            type="hidden"
                                                            name="enable"
                                                            value={event.enabled ? "false" : "true"}
                                                        />
                                                        <button
                                                            type="submit"
                                                            className={`text-xs rounded-full px-3 py-1 font-medium ${
                                                                event.enabled
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                                    : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
                                                            }`}
                                                        >
                                                            {event.enabled ? "On" : "Off"}
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
                )
            })}
        </div>
    )
}
