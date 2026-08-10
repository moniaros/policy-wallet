export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { BUSINESS_EVENTS } from "@/lib/events/catalog"
import { DECISION_RULES } from "@/lib/events/decision-engine"
import { setBusinessEventEnabled } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * The business event catalog.
 *
 * Disabling an event here stops the product REACTING to it. The event is still
 * recorded — the fact happened, and denying it would corrupt the log — but no
 * actions follow. That is deliberately different from disabling a notification,
 * which only stops the telling.
 */
export default async function BusinessEventsPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const [overrides, counts] = await Promise.all([
        db.businessEventOverride.findMany(),
        db.businessEvent.groupBy({ by: ["name"], _count: { _all: true } }),
    ])
    const overrideBy = new Map(overrides.map((o) => [o.eventType, o]))
    const countBy = new Map(counts.map((c) => [c.name, c._count._all]))

    const byAggregate = new Map<string, Array<[string, (typeof BUSINESS_EVENTS)[string]]>>()
    for (const entry of Object.entries(BUSINESS_EVENTS)) {
        const list = byAggregate.get(entry[1].aggregate) ?? []
        list.push(entry)
        byAggregate.set(entry[1].aggregate, list)
    }

    return (
        <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Business events</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        The facts the product reacts to. Disabling one stops the reactions — the fact
                        is still recorded.
                    </p>
                </div>
                <Link href="/admin/automation" className="pw-btn pw-btn-sm">Automation</Link>
            </div>

            {[...byAggregate.entries()].sort().map(([aggregate, events]) => (
                <section key={aggregate} className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        {aggregate}
                    </h2>
                    <div className="space-y-2">
                        {events.map(([key, definition]) => {
                            const override = overrideBy.get(key)
                            const enabled = override?.enabled ?? true
                            const planned = definition.status === "planned"
                            const seen = countBy.get(key) ?? 0
                            const hasRule = key in DECISION_RULES

                            return (
                                <article
                                    key={key}
                                    className={`${card} p-3 sm:p-4 ${enabled && !planned ? "" : "opacity-70"}`}
                                >
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="min-w-0">
                                            <h3 className="font-mono text-sm font-semibold text-stone-900 dark:text-white break-all">
                                                {key}
                                            </h3>
                                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                {definition.description}
                                            </p>
                                        </div>
                                        {planned ? (
                                            <span
                                                className="text-xs text-stone-500 dark:text-stone-400 shrink-0"
                                                title={definition.note}
                                            >
                                                planned
                                            </span>
                                        ) : (
                                            <form action={setBusinessEventEnabled} className="shrink-0">
                                                <input type="hidden" name="eventType" value={key} />
                                                <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                                                <button
                                                    type="submit"
                                                    className={`text-xs rounded-full px-3 py-1.5 font-medium min-h-11 sm:min-h-0 ${
                                                        enabled
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                            : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
                                                    }`}
                                                >
                                                    {enabled ? "On" : "Off"}
                                                </button>
                                            </form>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                                            {definition.priority}
                                        </span>
                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                                            {definition.kind}
                                        </span>
                                        {!hasRule && !planned && (
                                            // Not a fault: most facts are worth recording and not
                                            // worth acting on.
                                            <span className="text-kicker rounded px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                                                recorded only
                                            </span>
                                        )}
                                        {seen > 0 && (
                                            <span className="text-kicker rounded px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                {seen} recorded
                                            </span>
                                        )}
                                    </div>

                                    {planned && definition.note && (
                                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 border-l-2 border-stone-200 dark:border-stone-600 pl-2">
                                            {definition.note}
                                        </p>
                                    )}
                                    {override?.notes && (
                                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
                                            {override.notes}
                                        </p>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                </section>
            ))}
        </div>
    )
}
