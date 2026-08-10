export const runtime = 'nodejs'

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { getNotificationConfig } from "@/lib/notifications/config"
import {
    BACKOFF_CHOICES,
    PRIORITY_CHOICES,
    channelLabel,
    describeExpiry,
    describeRetry,
} from "@/lib/admin/notification-admin"
import { saveRuleOverride, resetRuleOverride } from "../../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
const hint = "text-xs text-stone-500 dark:text-stone-400 mt-1"

/**
 * Rule editor for one trigger.
 *
 * Every field offers "Inherit" and defaults to it. That is the whole design: an
 * override is a set of DELTAS, so an operator who changes one number does not
 * silently freeze the other nine against future improvements to the code
 * default.
 */
export default async function TriggerEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventType: string }>
    searchParams: Promise<{ saved?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const { eventType } = await params
    const { saved } = await searchParams

    const def = NOTIFICATION_EVENTS[eventType]
    if (!def) notFound()

    const config = await getNotificationConfig()
    const effective = config.events[eventType]

    const [override, revisions] = await Promise.all([
        db.notificationRuleOverride.findUnique({ where: { eventType } }),
        db.notificationRuleOverride
            .findUnique({ where: { eventType } })
            .then((row) =>
                row
                    ? db.notificationRuleRevision.findMany({
                          where: { overrideId: row.id },
                          orderBy: { createdAt: "desc" },
                          take: 20,
                      })
                    : []
            ),
    ])

    const overriddenChannels = Array.isArray(override?.channels)
        ? (override.channels as string[])
        : null

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                        {def.businessEvent}
                    </h1>
                    <code className="text-xs text-stone-500 dark:text-stone-400">{eventType}</code>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/notifications/triggers" className="pw-btn pw-btn-sm">
                        All triggers
                    </Link>
                    <Link
                        href={`/admin/notifications/templates/${eventType}`}
                        className="pw-btn pw-btn-sm"
                    >
                        Templates
                    </Link>
                </div>
            </div>

            {saved === "1" && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                    Saved. Applies to the next notification.
                </div>
            )}
            {saved === "nochange" && (
                <div className="rounded-lg border border-stone-300 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
                    Nothing changed, so no new version was recorded.
                </div>
            )}
            {saved === "reset" && (
                <div className="rounded-lg border border-stone-300 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
                    Override removed. This event is back on its code default.
                </div>
            )}

            {/* ── What the code says ─────────────────────────────────────── */}
            <section className={`${card} p-5`}>
                <h2 className="font-semibold text-stone-900 dark:text-white">Code default</h2>
                <p className={hint}>
                    Declared in <code className="text-xs">lib/notifications/registry.ts</code>. This is
                    what runs when there is no override, and what an empty database falls back to.
                </p>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Trigger condition</dt>
                        <dd className="text-stone-900 dark:text-white">{def.triggerCondition}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Priority</dt>
                        <dd className="text-stone-900 dark:text-white">{def.priority}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Channels</dt>
                        <dd className="text-stone-900 dark:text-white">
                            {def.channels.map(channelLabel).join(", ")}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Recipients</dt>
                        <dd className="text-stone-900 dark:text-white">{def.recipients.join(", ")}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Retry</dt>
                        <dd className="text-stone-900 dark:text-white">{describeRetry(def.retry)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Expires after</dt>
                        <dd className="text-stone-900 dark:text-white">
                            {describeExpiry(def.expiresAfterHours)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Required action</dt>
                        <dd className="text-stone-900 dark:text-white">{def.requiredAction ?? "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Escalation</dt>
                        <dd className="text-stone-900 dark:text-white">
                            {def.escalation
                                ? `${def.escalation.afterFailures ? `${def.escalation.afterFailures} failures` : `unread ${def.escalation.afterUnreadHours}h`} → ${def.escalation.notify}`
                                : "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-stone-500 dark:text-stone-400">Audit</dt>
                        <dd className="text-stone-900 dark:text-white">{def.audit}</dd>
                    </div>
                </dl>
                {def.note && (
                    <p className="mt-4 text-xs text-stone-600 dark:text-stone-400 border-l-2 border-stone-300 dark:border-stone-600 pl-3">
                        {def.note}
                    </p>
                )}
            </section>

            {def.transactional && (
                <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                    <strong>This event is transactional.</strong> It cannot be switched off and it
                    ignores customer notification preferences. That is deliberate: nobody consents
                    away from being told their card failed or their password changed, and a rule an
                    operator can bend must never be the rule protecting the customer from the
                    operator. Its other parameters are still editable below.
                </div>
            )}

            {/* ── Override ───────────────────────────────────────────────── */}
            <form action={saveRuleOverride} className={`${card} p-5 space-y-5`}>
                <input type="hidden" name="eventType" value={eventType} />
                <div>
                    <h2 className="font-semibold text-stone-900 dark:text-white">Override</h2>
                    <p className={hint}>
                        Every field defaults to <strong>Inherit</strong>. Leave it there unless you
                        mean to take control of that one value — an override is a set of deltas, so
                        inherited fields keep tracking the code default as it improves.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {!def.transactional && (
                        <div>
                            <label htmlFor="enabled" className={labelClass}>
                                Trigger
                            </label>
                            <select
                                id="enabled"
                                name="enabled"
                                defaultValue={
                                    override?.enabled === null || override?.enabled === undefined
                                        ? "inherit"
                                        : override.enabled
                                          ? "on"
                                          : "off"
                                }
                                className="pw-input pw-input-sm"
                            >
                                <option value="inherit">Inherit (on)</option>
                                <option value="on">On</option>
                                <option value="off">Off — stop firing this event</option>
                            </select>
                            <p className={hint}>
                                Off still records a row with reason{" "}
                                <code className="text-xs">trigger_disabled</code>, so what was
                                withheld stays visible.
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="priority" className={labelClass}>
                            Priority
                        </label>
                        <select
                            id="priority"
                            name="priority"
                            defaultValue={override?.priority ?? "inherit"}
                            className="pw-input pw-input-sm"
                        >
                            <option value="inherit">Inherit ({def.priority})</option>
                            {PRIORITY_CHOICES.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <span className={labelClass}>Channels</span>
                        <div className="flex flex-wrap gap-3">
                            {def.channels.map((channel) => (
                                <label key={channel} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        name="channels"
                                        value={channel}
                                        defaultChecked={
                                            overriddenChannels
                                                ? overriddenChannels.includes(channel)
                                                : true
                                        }
                                        className="h-4 w-4 accent-[var(--primary)]"
                                    />
                                    {channelLabel(channel)}
                                </label>
                            ))}
                        </div>
                        <p className={hint}>
                            Only the channels this event declares are offered — an override can narrow
                            the set but never widen it. Selecting all of them is the same as
                            inheriting. To stop the event entirely use the trigger switch, not an
                            empty channel list.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="retryAttempts" className={labelClass}>
                            Retry attempts
                        </label>
                        <input
                            id="retryAttempts"
                            name="retryAttempts"
                            type="number"
                            min={1}
                            max={20}
                            placeholder={`Inherit (${def.retry.attempts})`}
                            defaultValue={override?.retryAttempts ?? ""}
                            className="pw-input pw-input-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="retryBackoff" className={labelClass}>
                            Backoff
                        </label>
                        <select
                            id="retryBackoff"
                            name="retryBackoff"
                            defaultValue={override?.retryBackoff ?? "inherit"}
                            className="pw-input pw-input-sm"
                        >
                            <option value="inherit">Inherit ({def.retry.backoff})</option>
                            {BACKOFF_CHOICES.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="retryBaseDelayMinutes" className={labelClass}>
                            First retry delay (minutes)
                        </label>
                        <input
                            id="retryBaseDelayMinutes"
                            name="retryBaseDelayMinutes"
                            type="number"
                            min={0}
                            max={1440}
                            placeholder={`Inherit (${def.retry.baseDelayMinutes})`}
                            defaultValue={override?.retryBaseDelayMinutes ?? ""}
                            className="pw-input pw-input-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="expiresAfterHours" className={labelClass}>
                            Expires after (hours)
                        </label>
                        <input
                            id="expiresAfterHours"
                            name="expiresAfterHours"
                            type="number"
                            min={1}
                            placeholder={`Inherit (${def.expiresAfterHours ?? "never"})`}
                            defaultValue={override?.expiresAfterHours ?? ""}
                            className="pw-input pw-input-sm"
                        />
                        <p className={hint}>
                            Saving is rejected if the retry schedule would still be running after
                            this — a message that arrives once it has stopped being true is worse
                            than one that never came.
                        </p>
                    </div>

                    {def.escalation && (
                        <>
                            <div>
                                <label htmlFor="escalationAfterFailures" className={labelClass}>
                                    Escalate after N failures
                                </label>
                                <input
                                    id="escalationAfterFailures"
                                    name="escalationAfterFailures"
                                    type="number"
                                    min={1}
                                    placeholder={`Inherit (${def.escalation.afterFailures ?? "—"})`}
                                    defaultValue={override?.escalationAfterFailures ?? ""}
                                    className="pw-input pw-input-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="escalationAfterUnreadHours" className={labelClass}>
                                    Escalate after N hours unread
                                </label>
                                <input
                                    id="escalationAfterUnreadHours"
                                    name="escalationAfterUnreadHours"
                                    type="number"
                                    min={1}
                                    placeholder={`Inherit (${def.escalation.afterUnreadHours ?? "—"})`}
                                    defaultValue={override?.escalationAfterUnreadHours ?? ""}
                                    className="pw-input pw-input-sm"
                                />
                            </div>
                        </>
                    )}

                    <div className="md:col-span-2">
                        <label htmlFor="notes" className={labelClass}>
                            Why (recorded with the version)
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={2}
                            defaultValue={override?.notes ?? ""}
                            placeholder="e.g. Lowered to 3 points after the December feedback round."
                            className="pw-input pw-input-sm w-full"
                        />
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button type="submit" className="pw-btn">
                        Save override
                    </button>
                </div>
            </form>

            {override && (
                <form action={resetRuleOverride}>
                    <input type="hidden" name="eventType" value={eventType} />
                    <button type="submit" className="pw-btn pw-btn-sm">
                        Reset to code default
                    </button>
                </form>
            )}

            {/* ── Version history ────────────────────────────────────────── */}
            {revisions.length > 0 && (
                <section className={`${card} p-5`}>
                    <h2 className="font-semibold text-stone-900 dark:text-white">Version history</h2>
                    <ul className="mt-3 space-y-3">
                        {revisions.map((rev) => (
                            <li
                                key={rev.id}
                                className="text-sm border-l-2 border-stone-200 dark:border-stone-600 pl-3"
                            >
                                <div className="flex justify-between gap-4 flex-wrap">
                                    <span className="font-medium text-stone-900 dark:text-white">
                                        v{rev.version}
                                    </span>
                                    <span className="text-xs text-stone-500 dark:text-stone-400">
                                        {rev.changedByEmail} · {rev.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                                    </span>
                                </div>
                                <ul className="mt-1 space-y-0.5">
                                    {Object.entries(rev.changes as Record<string, { from: unknown; to: unknown }>).map(
                                        ([field, change]) => (
                                            <li key={field} className="text-xs text-stone-600 dark:text-stone-400">
                                                <code>{field}</code>: {JSON.stringify(change.from)} →{" "}
                                                <strong>{JSON.stringify(change.to)}</strong>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {effective?.overridden && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                    Currently overriding: {effective.overriddenFields.join(", ")}.
                </p>
            )}
        </div>
    )
}
