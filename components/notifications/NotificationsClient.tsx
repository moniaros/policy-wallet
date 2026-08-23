"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BellRing, CheckCheck, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"

// Each history item is one EVENT, grouped server-side from its per-channel
// delivery rows (§2.7). There is deliberately no `channel` here: which pipe
// carried a notification is operator bookkeeping, not customer-facing — the
// old channel chip both duplicated every multi-channel event and leaked the
// raw enum `in_app` (BASELINE.md, N1). `unread` is a server decision too: it
// reflects the event's in-app arm alone, so an event delivered only by email
// can never show an unread badge that "mark all as read" cannot clear.
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
        user: { id?: string; user_id?: string }
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
 */
export function NotificationsClient({ initialData, userLanguage = "en" }: NotificationsClientProps) {
    const { t, language } = useLanguage()
    const locale = language || userLanguage || "en"
    const isGreek = locale === "el"
    const tr = (el: string, en: string) => (isGreek ? el : en)

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
            toast.success(tr("Όλες σημάνθηκαν ως αναγνωσμένες.", "All marked as read."))
        } catch {
            setReadIds(new Set())
            toast.error(tr("Αποτυχία σήμανσης.", "Could not mark as read."))
        } finally {
            setMarkingRead(false)
        }
    }, [historyItems, tr])

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:pb-10">
                <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:bg-black">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint">
                            <BellRing aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-black dark:text-white">
                                {tr("Ειδοποιήσεις", "Notifications")}
                            </h1>
                            <p className="text-sm text-black/65 dark:text-white/70">
                                {tr("Τι σας έχουμε στείλει πρόσφατα.", "What we have sent you recently.")}
                            </p>
                        </div>
                    </div>
                    {/* Preferences live in settings — one screen, one source of truth. */}
                    <Link
                        href="/account/notifications"
                        className="pw-secondary-button pw-btn-sm inline-flex shrink-0 items-center gap-2"
                    >
                        <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
                        {/* Not t.settings.nav.notifications.label: that is
                            «Ειδοποιήσεις», the same word as the page title two
                            lines up — a button that repeats the heading tells
                            the reader nothing about what it DOES. It opens the
                            notification PREFERENCES. */}
                        {tr("Προτιμήσεις", "Preferences")}
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    {historyItems.length > 0 && unreadCount > 0 && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => void handleMarkAllRead()}
                                disabled={markingRead}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60 dark:text-mint"
                            >
                                <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                                {markingRead
                                    ? tr("Σήμανση...", "Marking...")
                                    : tr("Σήμανση όλων ως αναγνωσμένα", "Mark all as read")}
                            </button>
                        </div>
                    )}

                    {historyItems.length === 0 ? (
                        <div className="rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm dark:border-white/15 dark:bg-black">
                            <BellRing aria-hidden="true" className="mx-auto h-5 w-5 text-muted-foreground" />
                            <p className="mt-2 text-sm text-black/65 dark:text-white/70">
                                {tr("Δεν υπάρχουν πρόσφατες ειδοποιήσεις.", "No recent notification activity.")}
                            </p>
                        </div>
                    ) : (
                        historyItems.map((event) => {
                            const createdAtDate = new Date(event.created_at)
                            const createdAtText = Number.isNaN(createdAtDate.getTime())
                                ? event.created_at
                                : createdAtDate.toLocaleString(isGreek ? "el-GR" : "en-GB", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                  })
                            const isRead = readIds.has(event.event_id)

                            return (
                                <div
                                    key={event.event_id}
                                    onClick={() => void handleMarkRead(event.event_id)}
                                    role="button"
                                    tabIndex={0}
                                    // A role="button" must activate on Space as well as Enter
                                    // (WAI-ARIA button pattern). preventDefault stops Space
                                    // from scrolling the page instead of marking as read.
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            void handleMarkRead(event.event_id)
                                        }
                                    }}
                                    className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition ${
                                        isRead
                                            ? "border-black/10 bg-white dark:border-white/15 dark:bg-black"
                                            : "border-l-[3px] border-l-primary border-t-black/10 border-r-black/10 border-b-black/10 bg-primary/5 dark:border-b-white/15 dark:bg-primary/10"
                                    }`}
                                >
                                    {/* min-w-0 + shrink-0, and in that order of
                                        blame: the timestamp is `whitespace-nowrap`,
                                        so when this row ran out of width it was
                                        compressed to 54px with 103px of unbreakable
                                        date inside it, and the ink — not any element
                                        box — spilled to 340px in a 320px viewport.
                                        The wrappable text column absorbs the squeeze
                                        instead. */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p
                                                className={`text-sm text-black dark:text-white ${isRead ? "font-medium" : "font-bold"}`}
                                            >
                                                {fixMojibakeText(event.subject || "")}
                                            </p>
                                            {/* Clamped: stored messages carry whatever the
                                                writer put there — one quotes an insurer's
                                                full legal name («ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ
                                                ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ...»), five lines of
                                                boilerplate in a list cell. A list shows the
                                                gist; the item's own page shows the rest. */}
                                            <p className="mt-1 line-clamp-3 text-sm text-black/65 dark:text-white/70">
                                                {fixMojibakeText(event.message || "")}
                                            </p>
                                            {/* No channel chip. One card is one EVENT; which
                                                pipe delivered it (email, push, in-app) is not
                                                customer-facing information — and the chip's
                                                fallback leaked the raw enum `in_app`. */}
                                        </div>
                                        <p className="shrink-0 whitespace-nowrap text-xs font-medium text-black/60 dark:text-white/60">
                                            {createdAtText}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </motion.div>
            </div>
        </div>
    )
}
