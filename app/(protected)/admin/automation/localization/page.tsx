export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { TEMPLATE_LOCALES } from "@/lib/notifications/templates"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * Localization coverage.
 *
 * The number that matters is not "how many templates exist" but "how many exist
 * in ONE language only". A template written in Greek and never translated means
 * Greek readers get the operator's careful copy and English readers get the
 * code's fallback — for the same event, on the same day. That split is invisible
 * on the template list, where both look like a template that exists.
 *
 * Greek is the product default, so an English-only template is the more
 * surprising failure and is called out separately.
 */
export default async function LocalizationPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const templates = await db.notificationTemplate.findMany({
        where: { isActive: true },
        select: { eventType: true, channel: true, locale: true },
    })

    // Keyed by event+channel: a pair is complete when both languages exist.
    const pairs = new Map<string, Set<string>>()
    for (const t of templates) {
        const key = `${t.eventType}:${t.channel}`
        const set = pairs.get(key) ?? new Set<string>()
        set.add(t.locale)
        pairs.set(key, set)
    }

    const complete: string[] = []
    const missingEn: string[] = []
    const missingEl: string[] = []

    for (const [key, locales] of pairs) {
        const hasEl = locales.has("el")
        const hasEn = locales.has("en")
        if (hasEl && hasEn) complete.push(key)
        else if (hasEl) missingEn.push(key)
        else if (hasEn) missingEl.push(key)
    }

    const untemplated = Object.entries(NOTIFICATION_EVENTS)
        .filter(([key, def]) => def.category !== "analytics" && def.status === "live")
        .filter(([key]) => ![...pairs.keys()].some((p) => p.startsWith(`${key}:`)))
        .map(([key]) => key)

    const groups = [
        {
            title: "Split audience — Greek only",
            blurb: "Greek readers get the operator's copy; English readers get the code's fallback.",
            items: missingEn,
            tone: "amber",
        },
        {
            title: "Split audience — English only",
            blurb: "More surprising: Greek is the product default, so most readers get the fallback.",
            items: missingEl,
            tone: "red",
        },
        {
            title: "Complete pairs",
            blurb: "Both languages written. Everyone gets the operator's copy.",
            items: complete,
            tone: "emerald",
        },
    ] as const

    const toneClass = {
        amber: "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300",
        red: "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300",
        emerald: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300",
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Localization</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        {TEMPLATE_LOCALES.join(" · ")} — a template in one language only splits the
                        audience between operator copy and code fallback.
                    </p>
                </div>
                <Link href="/admin/automation" className="pw-btn pw-btn-sm">Automation</Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { label: "Complete", value: complete.length },
                    { label: "Split", value: missingEn.length + missingEl.length },
                    { label: "Code copy", value: untemplated.length },
                ].map((stat) => (
                    <div key={stat.label} className={`${card} p-3`}>
                        <div className="text-2xl font-bold text-stone-900 dark:text-white">{stat.value}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</div>
                    </div>
                ))}
            </div>

            {groups.map((group) =>
                group.items.length === 0 ? null : (
                    <section key={group.title} className={`${card} p-4`}>
                        <h2 className="font-semibold text-stone-900 dark:text-white">{group.title}</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-3">{group.blurb}</p>
                        <ul className="space-y-1.5">
                            {group.items.sort().map((key) => {
                                const [event, channel] = key.split(":")
                                return (
                                    <li key={key} className="flex items-center justify-between gap-2 flex-wrap">
                                        <Link
                                            href={`/admin/notifications/templates/${event}?channel=${channel}`}
                                            className="font-mono text-xs text-primary hover:underline break-all"
                                        >
                                            {event}
                                        </Link>
                                        <span className={`text-kicker rounded px-1.5 py-0.5 border ${toneClass[group.tone]}`}>
                                            {channel}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                )
            )}

            {untemplated.length > 0 && (
                <section className={`${card} p-4`}>
                    <h2 className="font-semibold text-stone-900 dark:text-white">Using the code's copy</h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-3">
                        No template at all. Not a fault — the code's copy is bilingual and correct;
                        this is simply where an operator has not taken over the wording.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {untemplated.sort().map((event) => (
                            <Link
                                key={event}
                                href={`/admin/notifications/templates/${event}`}
                                className="text-xs rounded-full bg-stone-100 dark:bg-stone-900 px-2.5 py-1 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-mono"
                            >
                                {event}
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
