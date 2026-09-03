"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { BellRing, CheckCheck, ChevronRight, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import { formatDate, formatTime } from "@/lib/i18n/format"
import { CardHead } from "@/components/dashboard/home/CardHead"

/**
 * A stored message, clamped — with the rest reachable.
 *
 * The clamp is right: stored messages carry whatever the writer put there, and
 * one quotes an insurer's full legal name over five lines in a list cell. What
 * was wrong is that the remainder had nowhere to go. The comment here used to
 * say "the item's own page shows the rest"; `/notifications` is a single
 * `page.tsx` with no per-item route, and nothing links to one — so the sentence
 * was false and the clipped half was unreachable anywhere in the product. Same
 * shape as the branch taglines (B-03, V2-P3-01).
 *
 * The toggle appears only when the text is ACTUALLY clipped, measured after
 * layout rather than guessed from a character count — a "show more" that
 * reveals nothing is its own small lie.
 *
 * `onFirstExpand` fires when the reader opens the full message: reading the
 * whole of a notification IS reading it, so the caller marks it read there —
 * one of the two per-item paths that replaced the old card-as-one-big-button
 * (a role="button" wrapping this very toggle, which is invalid ARIA and was
 * measured as 20 `nested-in-command` exclusions in the Phase 5 baseline).
 */
function ClampedMessage({
    text,
    moreLabel,
    lessLabel,
    onFirstExpand,
}: {
    text: string
    moreLabel: string
    lessLabel: string
    onFirstExpand?: () => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [clipped, setClipped] = useState(false)
    const ref = useRef<HTMLParagraphElement | null>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
        // Re-measure when the clamp is released and re-applied.
    }, [expanded, text])

    return (
        <>
            <p
                ref={ref}
                className={`mt-1 text-sm leading-relaxed text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}
            >
                {text}
            </p>
            {(clipped || expanded) && (
                <button
                    type="button"
                    onClick={() => {
                        setExpanded((v) => {
                            if (!v) onFirstExpand?.()
                            return !v
                        })
                    }}
                    aria-expanded={expanded}
                    className="mt-1 inline-flex min-h-11 items-center text-caption font-semibold text-primary underline-offset-2 hover:underline dark:text-mint"
                >
                    {expanded ? lessLabel : moreLabel}
                </button>
            )}
        </>
    )
}

// Each history item is one EVENT, grouped server-side from its per-channel
// delivery rows (§2.7). There is deliberately no `channel` here: which pipe
// carried a notification is operator bookkeeping, not customer-facing — the
// old channel chip both duplicated every multi-channel event and leaked the
// raw enum `in_app` (BASELINE.md, N1). `unread` is a server decision too: it
// reflects the event's in-app arm alone, so an event delivered only by email
// can never show an unread badge that "mark all as read" cannot clear.
//
// `related_policy_id` arrives only when the server VERIFIED the policy still
// exists and belongs to this reader (actions.ts) — the row's «Προβολή
// ασφαλιστηρίου» link renders only then, so every rendered destination
// resolves (§11.2, the destination guard; ledger N-07).
interface NotificationsClientProps {
    initialData: {
        history: Array<{
            event_id: string
            event_type: string
            subject: string | null
            message: string | null
            created_at: string
            unread: boolean
            related_policy_id?: string | null
            related_policy_name?: string | null
        }>
    }
    userLanguage?: string
}

/**
 * The notification history.
 *
 * This screen also carried a "Preferences" tab — a second, contradicting
 * control surface. Its catalog listed `pending_questionnaire` and
 * `policy_reviewed`, which no sender consults, and exposed `renewal_milestone`
 * on its own even though the settings switch governs it as part of the renewal
 * group. Both wrote the same `NotificationPreference` table, so a stream
 * switched off in settings could be half-revived here. Preferences now live in
 * one place, and this shows what was sent.
 *
 * Phase 5 rebuild (PW-MOBILE-TRANSFORM-02), each change measurement-driven:
 *
 * - Cards go through `.pw-card`, not a hand-rolled border recipe. The old
 *   `border-black/10` edge measured 1.21–1.37:1 on 24 interactive cards —
 *   below the 3:1 SC 1.4.11 asks of a control's boundary (the same defect the
 *   dashboard measured 20× at its Goal 4, fixed by the element-scoped
 *   `--pw-border-control` rule in globals.css).
 * - The card is no longer one big `role="button"`. A button wrapping the
 *   show-more button is invalid ARIA (no interactive descendants inside a
 *   control), and the baseline measured all 20 expand toggles excluded as
 *   `nested-in-command`. Mark-as-read now has two explicit per-item paths:
 *   the unread indicator is itself a 44×44 button, and opening the full
 *   message marks the item read.
 * - Rows are `<li>` in a real list: structure for free (each row is its own
 *   action subject, so 24 «Εμφάνιση ολόκληρου μηνύματος» toggles are 24
 *   subjects, not one action offered 24 times) and semantics for screen
 *   readers.
 */
export function NotificationsClient({ initialData, userLanguage = "en" }: NotificationsClientProps) {
    const { t, language } = useLanguage()
    const locale = language || userLanguage || "en"
    const isGreek = locale === "el"

    const [readIds, setReadIds] = useState<Set<string>>(() => {
        const set = new Set<string>()
        for (const item of initialData.history) {
            if (!item.unread) set.add(item.event_id)
        }
        return set
    })
    const [markingRead, setMarkingRead] = useState(false)

    const historyItems = useMemo(() => initialData.history.slice(0, 24), [initialData.history])
    const unreadCount = useMemo(
        () => historyItems.filter((e) => !readIds.has(e.event_id)).length,
        [historyItems, readIds]
    )

    const handleMarkRead = useCallback(
        async (eventId: string) => {
            if (readIds.has(eventId)) return
            setReadIds((prev) => new Set(prev).add(eventId))
            try {
                const { markNotificationRead } = await import("@/app/(protected)/notifications/actions")
                await markNotificationRead(eventId)
            } catch {
                setReadIds((prev) => {
                    const next = new Set(prev)
                    next.delete(eventId)
                    return next
                })
            }
        },
        [readIds]
    )

    const handleMarkAllRead = useCallback(async () => {
        setMarkingRead(true)
        const allIds = new Set(historyItems.map((e) => e.event_id))
        setReadIds(allIds)
        try {
            const { markAllNotificationsRead } = await import("@/app/(protected)/notifications/actions")
            await markAllNotificationsRead()
            toast.success(t.notifications.allMarkedRead)
        } catch {
            setReadIds(new Set())
            toast.error(t.notifications.markAllReadFailed)
        } finally {
            setMarkingRead(false)
        }
    }, [historyItems, t])

    // One card of DAY-GROUPED rows, not twenty-four same-size cards: the day
    // is the group heading in the app's long-date register, each row keeps
    // only its time of day, and the unread mark sits in a fixed left gutter so
    // read and unread titles share one x. Grouping is Athens-pinned through
    // the same formatter the rest of the app uses.
    const lang = isGreek ? "el" : "en"
    const groups: Array<{ key: string; heading: string; items: typeof historyItems }> = []
    for (const event of historyItems) {
        const createdAtDate = new Date(event.created_at)
        const valid = !Number.isNaN(createdAtDate.getTime())
        const key = valid ? formatDate(createdAtDate, lang) : event.created_at
        let group = groups[groups.length - 1]
        if (!group || group.key !== key) {
            group = {
                key,
                heading: valid
                    ? formatDate(createdAtDate, lang, { day: "numeric", month: "long", year: "numeric" })
                    : event.created_at,
                items: [],
            }
            groups.push(group)
        }
        group.items.push(event)
    }

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide px-4 pb-4 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
                <div className="max-w-4xl">
                <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-h3 font-semibold tracking-tight text-foreground">
                            {t.notifications.pageTitle}
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {t.notifications.pageSubtitle}
                        </p>
                    </div>
                    {/* Both header actions on one row, one size. Preferences live
                        in settings — one screen, one source of truth. Not
                        t.settings.nav.notifications.label: that is «Ειδοποιήσεις»,
                        the same word as the page title — a button that repeats
                        the heading tells the reader nothing about what it DOES. */}
                    <div className="flex flex-wrap gap-2">
                        {historyItems.length > 0 && unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void handleMarkAllRead()}
                                disabled={markingRead}
                                data-action="dismiss"
                                className="pw-soft-button cursor-pointer disabled:opacity-60"
                            >
                                <CheckCheck aria-hidden="true" className="h-4 w-4" />
                                {markingRead ? t.notifications.markingAllRead : t.notifications.markAllRead}
                            </button>
                        )}
                        <Link href="/account/notifications" className="pw-soft-button shrink-0">
                            <Settings2 aria-hidden="true" className="h-4 w-4" />
                            {t.notifications.preferences}
                        </Link>
                    </div>
                </header>

                {historyItems.length === 0 ? (
                    <section id="history" aria-label={t.notifications.pageTitle} className="pw-card pw-pad-roomy text-center">
                        <BellRing aria-hidden="true" className="mx-auto h-5 w-5 text-muted-foreground" />
                        {/* An empty history says it is empty — never "all clear".
                            No notification having been sent is not evidence that
                            nothing needs attention (CLAUDE.md, absence-is-not-
                            reassurance). */}
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t.notifications.noNotificationsYet}
                        </p>
                    </section>
                ) : (
                    <section id="history" aria-labelledby="history-heading" className="pw-card pw-pad">
                        <CardHead icon={BellRing} title={t.notifications.pageTitle} id="history-heading" />
                        <div className="mt-4 space-y-5">
                            {groups.map((group) => (
                                <div key={group.key}>
                                    <h3 className="text-caption font-semibold text-muted-foreground">{group.heading}</h3>
                                    <ul role="list" className="mt-1 divide-y divide-border">
                                        {group.items.map((event) => {
                                            const createdAtDate = new Date(event.created_at)
                                            const timeText = Number.isNaN(createdAtDate.getTime())
                                                ? ""
                                                : formatTime(createdAtDate, lang, { hour: "numeric" })
                                            const isRead = readIds.has(event.event_id)

                                            return (
                                                <li key={event.event_id} className="flex items-start gap-2 py-3">
                                                    {/* Fixed gutter: the 44px mark-read control
                                                        when unread, empty space when read, so
                                                        every title starts on the same x. */}
                                                    <span className="-ml-2.5 -my-2.5 flex h-11 w-9 shrink-0 items-center justify-center">
                                                        {!isRead && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleMarkRead(event.event_id)}
                                                                aria-label={t.notifications.markRead}
                                                                data-action="dismiss"
                                                                data-action-subject={event.event_id}
                                                                className="flex h-11 w-9 items-center justify-center"
                                                            >
                                                                {/* Unread is never colour alone: the dot
                                                                    pairs with the semibold title, and the
                                                                    control names itself. 6px, not 10: a
                                                                    bounded element ≥8×8 reads as a
                                                                    CONTAINER to the density metric. */}
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-mint"
                                                                />
                                                            </button>
                                                        )}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline justify-between gap-3">
                                                            <p className={`text-sm text-foreground ${isRead ? "font-medium" : "font-semibold"}`}>
                                                                {fixMojibakeText(event.subject || "")}
                                                            </p>
                                                            <p className="shrink-0 text-caption tabular-nums text-muted-foreground">{timeText}</p>
                                                        </div>
                                                        <ClampedMessage
                                                            text={fixMojibakeText(event.message || "")}
                                                            moreLabel={t.notifications.showFullMessage}
                                                            lessLabel={t.notifications.showLessMessage}
                                                            onFirstExpand={() => void handleMarkRead(event.event_id)}
                                                        />
                                                        {/* No channel chip. One row is one EVENT; which
                                                            pipe delivered it is not customer-facing. */}
                                                        {event.related_policy_id && (
                                                            <Link
                                                                href={`/wallet/${event.related_policy_id}`}
                                                                data-action="viewPolicy"
                                                                // Subject = the EVENT, not the policy: the
                                                                // offer is row-scoped, and two notifications
                                                                // about one policy are two rows.
                                                                data-action-subject={event.event_id}
                                                                className="mt-1 inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary underline-offset-2 hover:underline dark:text-mint"
                                                            >
                                                                {t.notifications.viewPolicy}
                                                                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                </div>
            </div>
        </div>
    )
}
