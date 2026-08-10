export const runtime = 'nodejs'

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import {
    TEMPLATE_LOCALES,
    interpolate,
    validateTemplate,
    variablesFor,
} from "@/lib/notifications/templates"
import { channelLabel } from "@/lib/admin/notification-admin"
import { saveTemplate, deleteTemplate, sendTestNotification } from "../../actions"
import { cloneTemplate } from "../../../automation/actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"

/**
 * Sample values for the preview.
 *
 * Obviously-fake but realistically-shaped: a preview filled with "string" tells
 * an author nothing about whether their sentence reads well, and a preview
 * filled with a REAL customer's data would put one person's policy number on an
 * admin screen for no reason.
 */
const SAMPLE_VARS: Record<string, string | number> = {
    recipientName: "Μαρία Παπαδοπούλου",
    appName: "PolicyWallet",
    policyNumber: "POL-123456",
    insurerName: "Interamerican",
    branchLabel: "Motor",
    counterpartyName: "Γιώργος Ιωάννου",
    customerName: "Μαρία Παπαδοπούλου",
    expiryDate: "31/12/2026",
    daysUntilExpiry: 30,
    gapName: "Loss of the income your household depends on",
    gapCount: 2,
    riskName: "Home rebuild after earthquake",
    changeCount: 3,
    previousScore: 61,
    currentScore: 74,
    scoreDelta: 13,
    recommendationCount: 4,
    lifeEventLabel: "A child was born",
    flagReason: "Premium looks wrong",
}

export default async function TemplateEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventType: string }>
    searchParams: Promise<{ saved?: string; tested?: string; channel?: string; locale?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    const { eventType } = await params
    const { saved, tested, channel: channelParam, locale: localeParam } = await searchParams

    const def = NOTIFICATION_EVENTS[eventType]
    if (!def) notFound()

    const editableChannels = def.channels.filter(
        (c): c is "in_app" | "email" | "push" => c === "in_app" || c === "email" || c === "push"
    )
    const channel = editableChannels.includes(channelParam as never)
        ? (channelParam as "in_app" | "email" | "push")
        : editableChannels[0]
    const locale = TEMPLATE_LOCALES.includes(localeParam as never)
        ? (localeParam as "el" | "en")
        : "el"

    const [existing, revisions] = await Promise.all([
        channel
            ? db.notificationTemplate.findUnique({
                  where: { eventType_channel_locale: { eventType, channel, locale } },
              })
            : null,
        channel
            ? db.notificationTemplate
                  .findUnique({
                      where: { eventType_channel_locale: { eventType, channel, locale } },
                      select: { id: true },
                  })
                  .then((row) =>
                      row
                          ? db.notificationTemplateRevision.findMany({
                                where: { templateId: row.id },
                                orderBy: { createdAt: "desc" },
                                take: 10,
                            })
                          : []
                  )
            : [],
    ])

    const allowed = variablesFor(eventType)
    const issues = existing
        ? validateTemplate(
              { subject: existing.subject, title: existing.title, body: existing.body },
              eventType
          )
        : []

    const preview = existing
        ? {
              subject: existing.subject ? interpolate(existing.subject, SAMPLE_VARS, allowed) : null,
              title: interpolate(existing.title, SAMPLE_VARS, allowed),
              body: interpolate(existing.body, SAMPLE_VARS, allowed),
          }
        : null

    if (editableChannels.length === 0) {
        return (
            <div className="p-6 max-w-3xl space-y-4">
                <h1 className="text-2xl font-bold text-stone-900 dark:text-white">{def.businessEvent}</h1>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                    This event has no customer-facing channel, so there is no copy to author. It is
                    recorded on the <code>analytics</code> channel only.
                </p>
                <Link href="/admin/notifications/templates" className="pw-btn pw-btn-sm">
                    All templates
                </Link>
            </div>
        )
    }

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
                    <Link href="/admin/notifications/templates" className="pw-btn pw-btn-sm">
                        All templates
                    </Link>
                    <Link
                        href={`/admin/notifications/triggers/${eventType}`}
                        className="pw-btn pw-btn-sm"
                    >
                        Rules
                    </Link>
                </div>
            </div>

            {saved === "1" && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                    Template saved as a new version.
                </div>
            )}
            {saved === "deleted" && (
                <div className="rounded-lg border border-stone-300 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
                    Template deleted. This event is back on the code&apos;s own copy.
                </div>
            )}
            {tested && (
                <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                    Test sent to you{tested === "none" ? " — but nothing was delivered. Check the settings and your own preferences." : ` on: ${tested}.`}
                </div>
            )}

            {/* ── Channel / locale picker ────────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                {editableChannels.map((c) =>
                    TEMPLATE_LOCALES.map((l) => (
                        <Link
                            key={`${c}:${l}`}
                            href={`/admin/notifications/templates/${eventType}?channel=${c}&locale=${l}`}
                            className={`text-xs rounded-full px-3 py-1.5 font-medium ${
                                c === channel && l === locale
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                            }`}
                        >
                            {channelLabel(c)} · {l.toUpperCase()}
                        </Link>
                    ))
                )}
            </div>

            {issues.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <strong>Unknown variables.</strong> These render as empty text, not as the literal
                    placeholder:
                    <ul className="mt-1 list-disc pl-5">
                        {issues.map((i) => (
                            <li key={i.field}>
                                <code>{i.field}</code>: {i.unknownVariables.map((v) => `{{${v}}}`).join(", ")}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <form action={saveTemplate} className={`${card} p-5 space-y-4`}>
                <input type="hidden" name="eventType" value={eventType} />
                <input type="hidden" name="channel" value={channel} />
                <input type="hidden" name="locale" value={locale} />

                <div>
                    <h2 className="font-semibold text-stone-900 dark:text-white">
                        {channelLabel(channel)} · {locale.toUpperCase()}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        With no template here, the event uses whatever the code passes. Saving one
                        takes over the wording for this channel and language only.
                    </p>
                </div>

                {channel === "email" && (
                    <div>
                        <label htmlFor="subject" className={labelClass}>
                            Subject
                        </label>
                        <input
                            id="subject"
                            name="subject"
                            defaultValue={existing?.subject ?? ""}
                            className="pw-input pw-input-sm w-full"
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="title" className={labelClass}>
                        Title
                    </label>
                    <input
                        id="title"
                        name="title"
                        required
                        defaultValue={existing?.title ?? ""}
                        className="pw-input pw-input-sm w-full"
                    />
                </div>

                <div>
                    <label htmlFor="body" className={labelClass}>
                        Body
                    </label>
                    <textarea
                        id="body"
                        name="body"
                        required
                        rows={channel === "push" ? 3 : 6}
                        defaultValue={existing?.body ?? ""}
                        className="pw-input pw-input-sm w-full font-mono text-xs"
                    />
                    {channel === "push" && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                            Devices truncate push bodies at around 180 characters. Anything past that
                            is not shown at all, so saving is rejected above that length.
                        </p>
                    )}
                </div>

                <div>
                    <span className={labelClass}>Available variables</span>
                    <div className="flex flex-wrap gap-1.5">
                        {allowed.map((v) => (
                            <code
                                key={v}
                                className="text-micro rounded bg-stone-100 dark:bg-stone-900 px-2 py-1 text-stone-700 dark:text-stone-300"
                            >
                                {`{{${v}}}`}
                            </code>
                        ))}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        Closed list, per event. Anything else renders empty — which is what keeps a
                        typo a terse sentence instead of a leaked identifier.
                    </p>
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={existing?.isActive ?? true}
                        className="h-4 w-4 accent-[var(--primary)]"
                    />
                    Active
                </label>

                <div className="flex gap-2 flex-wrap">
                    <button type="submit" className="pw-btn">
                        Save {existing ? `as v${existing.version + 1}` : "template"}
                    </button>
                </div>
            </form>

            {preview && (
                <section className={`${card} p-5`}>
                    <h2 className="font-semibold text-stone-900 dark:text-white">Preview</h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-3">
                        Rendered with sample values. Fake data on purpose — a preview built from a
                        real customer&apos;s record would put their policy number on this screen for
                        no reason.
                    </p>
                    <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-4 space-y-2">
                        {preview.subject && (
                            <div className="text-xs text-stone-500 dark:text-stone-400">
                                Subject: <span className="text-stone-900 dark:text-white">{preview.subject}</span>
                            </div>
                        )}
                        <div className="font-semibold text-stone-900 dark:text-white">{preview.title}</div>
                        <div className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                            {preview.body}
                        </div>
                    </div>
                </section>
            )}

            <div className="flex gap-2 flex-wrap">
                <form action={sendTestNotification}>
                    <input type="hidden" name="eventType" value={eventType} />
                    <button type="submit" className="pw-btn pw-btn-sm">
                        Send test to myself
                    </button>
                </form>
                {existing && (
                    <form action={deleteTemplate}>
                        <input type="hidden" name="templateId" value={existing.id} />
                        <input type="hidden" name="eventType" value={eventType} />
                        <button type="submit" className="pw-btn pw-btn-sm">
                            Delete template
                        </button>
                    </form>
                )}

                {existing && (
                    <form action={cloneTemplate} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="templateId" value={existing.id} />
                        <input type="hidden" name="targetEvent" value={eventType} />
                        <input type="hidden" name="targetChannel" value={channel} />
                        <div>
                            <label htmlFor="cloneLocale" className="block text-caption text-stone-500 dark:text-stone-400 mb-1">
                                Clone to language
                            </label>
                            <select
                                id="cloneLocale"
                                name="targetLocale"
                                defaultValue={locale === "el" ? "en" : "el"}
                                className="pw-input pw-input-sm"
                            >
                                {TEMPLATE_LOCALES.filter((l) => l !== locale).map((l) => (
                                    <option key={l} value={l}>{l.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="pw-btn pw-btn-sm">Clone</button>
                    </form>
                )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
                A clone arrives <strong>inactive</strong>. A copy is almost always about to be
                translated, and publishing Greek copy to English readers the moment it is cloned is
                the obvious way for that feature to cause harm.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
                A test send goes to <strong>you</strong> and nobody else. The recipient is not a form
                field on purpose — a test-send that can address anyone is a way to send arbitrary
                text from a trusted sender, which is a phishing tool, not a preview.
            </p>

            {revisions.length > 0 && (
                <section className={`${card} p-5`}>
                    <h2 className="font-semibold text-stone-900 dark:text-white">Version history</h2>
                    <ul className="mt-3 space-y-3">
                        {revisions.map((rev) => (
                            <li key={rev.id} className="text-sm border-l-2 border-stone-200 dark:border-stone-600 pl-3">
                                <div className="flex justify-between gap-4 flex-wrap">
                                    <span className="font-medium text-stone-900 dark:text-white">v{rev.version}</span>
                                    <span className="text-xs text-stone-500 dark:text-stone-400">
                                        {rev.changedByEmail} ·{" "}
                                        {rev.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                                    </span>
                                </div>
                                <ul className="mt-1 space-y-0.5">
                                    {Object.keys(rev.changes as Record<string, unknown>).map((field) => (
                                        <li key={field} className="text-xs text-stone-600 dark:text-stone-400">
                                            <code>{field}</code> changed
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
