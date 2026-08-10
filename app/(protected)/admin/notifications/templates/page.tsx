export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { TEMPLATE_CHANNELS, TEMPLATE_LOCALES } from "@/lib/notifications/templates"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * Which events have admin-authored copy, and in which languages.
 *
 * The coverage grid matters more than the list: a template that exists in Greek
 * but not English means half the customers get the code's copy and half get the
 * operator's, for the same event — a split nobody would choose deliberately and
 * which is invisible without a view like this.
 */
export default async function TemplatesIndexPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const templates = await db.notificationTemplate.findMany({
        select: { eventType: true, channel: true, locale: true, isActive: true },
    })

    const byEvent = new Map<string, Set<string>>()
    for (const t of templates) {
        if (!t.isActive) continue
        const set = byEvent.get(t.eventType) ?? new Set<string>()
        set.add(`${t.channel}:${t.locale}`)
        byEvent.set(t.eventType, set)
    }

    // Deliverable events only. The analytics mirror has no copy a customer ever
    // reads, so offering to write templates for it would be an invitation to
    // waste an afternoon.
    const events = Object.entries(NOTIFICATION_EVENTS)
        .filter(([, def]) => def.category !== "analytics")
        .sort(([a], [b]) => {
            const aHas = byEvent.has(a) ? 0 : 1
            const bHas = byEvent.has(b) ? 0 : 1
            return aHas - bHas || a.localeCompare(b)
        })

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Templates</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Admin-authored copy per event, channel and language. An event with no template
                        uses the wording in the code — which is the case for every event until someone
                        writes one.
                    </p>
                </div>
                <Link href="/admin/notifications" className="pw-btn pw-btn-sm">
                    Back to overview
                </Link>
            </div>

            <section className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-50 dark:bg-stone-900 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                            <tr>
                                <th className="text-left px-5 py-2 font-medium">Event</th>
                                {TEMPLATE_CHANNELS.map((channel) =>
                                    TEMPLATE_LOCALES.map((locale) => (
                                        <th key={`${channel}:${locale}`} className="px-3 py-2 font-medium">
                                            {channel} · {locale}
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                            {events.map(([key, def]) => {
                                const have = byEvent.get(key) ?? new Set<string>()
                                return (
                                    <tr key={key}>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/admin/notifications/templates/${key}`}
                                                className="font-mono text-xs text-primary hover:underline"
                                            >
                                                {key}
                                            </Link>
                                            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                {def.businessEvent}
                                            </div>
                                        </td>
                                        {TEMPLATE_CHANNELS.map((channel) =>
                                            TEMPLATE_LOCALES.map((locale) => {
                                                // A channel the event does not use gets a dash, not
                                                // an "empty" marker: there is nothing missing.
                                                const applicable = def.channels.includes(channel)
                                                const has = have.has(`${channel}:${locale}`)
                                                return (
                                                    <td
                                                        key={`${channel}:${locale}`}
                                                        className="px-3 py-3 text-center"
                                                    >
                                                        {!applicable ? (
                                                            <span className="text-stone-300 dark:text-stone-600">—</span>
                                                        ) : has ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400">●</span>
                                                        ) : (
                                                            <span className="text-stone-300 dark:text-stone-600">○</span>
                                                        )}
                                                    </td>
                                                )
                                            })
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="text-xs text-stone-500 dark:text-stone-400">
                ● template written · ○ using the code&apos;s copy · — channel not used by this event
            </p>
        </div>
    )
}
