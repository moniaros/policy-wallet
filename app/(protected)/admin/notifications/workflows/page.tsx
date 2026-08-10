export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { BUSINESS_EVENTS } from "@/lib/events/catalog"
import { DECISION_RULES } from "@/lib/events/decision-engine"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

const STATUS_TONE: Record<string, string> = {
    succeeded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    pending: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
    skipped: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
    dead: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
}

interface ActionRecord {
    performed?: Array<{ type: string; status: string; reason?: string; detail?: string }>
    skipped?: Array<{ type: string; reason: string }>
}

/**
 * The workflow view: Business Event → Decision Engine → Actions.
 *
 * Deliberately shows what was DECIDED alongside what was done, including the
 * actions that were deliberately not taken and why. "We considered notifying
 * the advisor and there wasn't one" is the answer to the question an operator
 * actually arrives with, and it is invisible in a log that only records
 * successes.
 *
 * Mobile-first: this renders as stacked cards at every width rather than a wide
 * table. The audit noted the other admin tables scroll horizontally on a phone,
 * which is tolerable for a reference list and not for the screen someone opens
 * while a customer is on the phone asking why nothing happened.
 */
export default async function WorkflowsPage({
    searchParams,
}: {
    searchParams: Promise<{ event?: string; status?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const { event, status } = await searchParams

    const [recent, pendingCount, failedCount, byName] = await Promise.all([
        db.businessEvent.findMany({
            where: { ...(event ? { name: event } : {}) },
            orderBy: { recordedAt: "desc" },
            take: 40,
            select: {
                id: true,
                name: true,
                occurredAt: true,
                recordedAt: true,
                actorType: true,
                aggregateType: true,
                correlationId: true,
                causationId: true,
                subjectUserId: true,
                deliveries: {
                    where: status ? { status } : undefined,
                    select: { subscriber: true, status: true, attempts: true, actions: true, lastError: true },
                },
            },
        }),
        db.businessEvent.count({ where: { dispatchState: "pending" } }),
        db.businessEventDelivery.count({ where: { status: { in: ["failed", "dead"] } } }),
        db.businessEvent.groupBy({
            by: ["name"],
            _count: { _all: true },
            orderBy: { _count: { name: "desc" } },
            take: 8,
        }),
    ])

    const declared = Object.keys(BUSINESS_EVENTS).length
    const live = Object.values(BUSINESS_EVENTS).filter((d) => d.status === "live").length
    const withRules = Object.keys(DECISION_RULES).length

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Workflows</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Business Event → Decision Engine → Actions. Every reaction in the product
                        starts here.
                    </p>
                </div>
                <Link href="/admin/notifications" className="pw-btn pw-btn-sm">
                    Notifications
                </Link>
            </div>

            {/* ── Health ─────────────────────────────────────────────────── */}
            <section className={`${card} p-4 sm:p-5`}>
                <h2 className="font-semibold text-stone-900 dark:text-white">Event log</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {[
                        { label: "Declared", value: declared },
                        { label: "Live", value: live },
                        { label: "Awaiting dispatch", value: pendingCount, tone: pendingCount > 50 ? "text-amber-600 dark:text-amber-400" : undefined },
                        { label: "Failed deliveries", value: failedCount, tone: failedCount > 0 ? "text-red-600 dark:text-red-400" : undefined },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3">
                            <div className={`text-2xl font-bold ${stat.tone ?? "text-stone-900 dark:text-white"}`}>
                                {stat.value}
                            </div>
                            <div className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
                    {withRules} of {live} live events have a decision rule. An event without one is
                    recorded and audited and nothing else follows — a legitimate outcome, since most
                    facts are worth knowing and not worth acting on.
                </p>
            </section>

            {/* ── Busiest events ─────────────────────────────────────────── */}
            {byName.length > 0 && (
                <section className={`${card} p-4 sm:p-5`}>
                    <h2 className="font-semibold text-stone-900 dark:text-white mb-3">Most frequent</h2>
                    <div className="flex flex-wrap gap-2">
                        {byName.map((row) => (
                            <Link
                                key={row.name}
                                href={`/admin/notifications/workflows?event=${row.name}`}
                                className="text-xs rounded-full bg-stone-100 dark:bg-stone-900 px-3 py-1.5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                            >
                                <span className="font-mono">{row.name}</span>{" "}
                                <strong>{row._count._all}</strong>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {(event || status) && (
                <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span className="text-stone-500 dark:text-stone-400">
                        Filtered{event ? ` to ${event}` : ""}
                        {status ? ` · ${status}` : ""}
                    </span>
                    <Link href="/admin/notifications/workflows" className="text-primary hover:underline text-xs">
                        Clear
                    </Link>
                </div>
            )}

            {/* ── The workflows ──────────────────────────────────────────── */}
            <section className="space-y-3">
                {recent.length === 0 && (
                    <div className={`${card} p-8 text-center text-stone-500 dark:text-stone-400`}>
                        No events recorded yet.
                    </div>
                )}

                {recent.map((evt) => {
                    const definition = BUSINESS_EVENTS[evt.name]
                    // occurredAt vs recordedAt differ constantly in insurance: a
                    // life event declared today may have happened last year.
                    // Showing both is the only way an operator can tell a
                    // backdated fact from a delayed one.
                    const backdated =
                        Math.abs(evt.occurredAt.getTime() - evt.recordedAt.getTime()) > 60_000

                    return (
                        <article key={evt.id} className={`${card} p-4 sm:p-5`}>
                            {/* Event */}
                            <header className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                    <h3 className="font-mono text-sm font-semibold text-stone-900 dark:text-white break-all">
                                        {evt.name}
                                    </h3>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                        {definition?.description ?? "Unknown event — its definition has been retired"}
                                    </p>
                                </div>
                                <div className="flex gap-1.5 flex-wrap shrink-0">
                                    <span className="text-kicker rounded px-1.5 py-0.5 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                                        {evt.actorType}
                                    </span>
                                    {definition?.kind === "derived" && (
                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                            derived
                                        </span>
                                    )}
                                    {evt.causationId && (
                                        <span className="text-kicker rounded px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                            caused by another event
                                        </span>
                                    )}
                                </div>
                            </header>

                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                                Recorded {evt.recordedAt.toISOString().slice(0, 16).replace("T", " ")}
                                {backdated && (
                                    <>
                                        {" · "}
                                        <span className="text-amber-700 dark:text-amber-400">
                                            occurred {evt.occurredAt.toISOString().slice(0, 10)}
                                        </span>
                                    </>
                                )}
                            </p>

                            {/* Decision → Actions */}
                            {evt.deliveries.map((delivery) => {
                                const record = (delivery.actions ?? {}) as ActionRecord
                                const performed = record.performed ?? []
                                const skipped = record.skipped ?? []

                                return (
                                    <div
                                        key={delivery.subscriber}
                                        className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700"
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                                                {delivery.subscriber}
                                            </span>
                                            <span
                                                className={`text-xs rounded px-2 py-0.5 ${STATUS_TONE[delivery.status] ?? STATUS_TONE.pending}`}
                                            >
                                                {delivery.status}
                                                {delivery.attempts > 1 ? ` · ${delivery.attempts} attempts` : ""}
                                            </span>
                                        </div>

                                        {performed.length > 0 && (
                                            <ul className="mt-2 space-y-1">
                                                {performed.map((action, i) => (
                                                    <li
                                                        key={`${action.type}-${i}`}
                                                        className="text-xs flex items-start gap-2"
                                                    >
                                                        <span
                                                            className={
                                                                action.status === "done"
                                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                                    : action.status === "failed"
                                                                      ? "text-red-600 dark:text-red-400"
                                                                      : "text-stone-400"
                                                            }
                                                            aria-hidden="true"
                                                        >
                                                            {action.status === "done" ? "✓" : action.status === "failed" ? "✕" : "–"}
                                                        </span>
                                                        <span className="text-stone-700 dark:text-stone-300">
                                                            <span className="sr-only">{action.status}: </span>
                                                            <span className="font-mono">{action.type}</span>
                                                            {action.detail && (
                                                                <span className="text-stone-500 dark:text-stone-400">
                                                                    {" "}
                                                                    — {action.detail}
                                                                </span>
                                                            )}
                                                            {action.reason && action.status !== "done" && (
                                                                <span className="text-stone-500 dark:text-stone-400">
                                                                    {" "}
                                                                    — {action.reason}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {skipped.length > 0 && (
                                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                                                Not taken:{" "}
                                                {skipped.map((s) => `${s.type} (${s.reason})`).join(", ")}
                                            </p>
                                        )}

                                        {delivery.lastError && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-2 break-words">
                                                {delivery.lastError}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}

                            {evt.deliveries.length === 0 && (
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                                    Awaiting dispatch — the sweep will pick this up.
                                </p>
                            )}
                        </article>
                    )
                })}
            </section>
        </div>
    )
}
