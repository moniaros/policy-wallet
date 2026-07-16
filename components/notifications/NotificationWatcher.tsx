"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    selectNewNotifications,
    notificationTone,
    TOASTABLE_EVENT_TYPES,
    type RecentNotification,
} from "@/lib/notifications/watcher"

interface Props {
    /** Scopes the last-seen marker per user so it never leaks across accounts. */
    userId: string
    /** Poll cadence in ms. */
    intervalMs?: number
}

const POLL_MS = 25_000
// Guard against a flood when returning after a long absence — a stale marker
// could otherwise fire many toasts at once.
const MAX_TOASTS_PER_TICK = 3

/**
 * Polls the agent's recent notifications and surfaces newly-arrived analysis
 * outcomes as a live toast — so an agent who uploaded a policy and closed the
 * dialog is told the moment the background analysis finishes, even while idle on
 * another page. The durable record stays on /notifications; this also refreshes
 * so the sidebar unread badge updates.
 */
export function NotificationWatcher({ userId, intervalMs = POLL_MS }: Props) {
    const router = useRouter()
    const storageKey = `pw:notif:lastSeen:${userId}`
    const runningRef = useRef(false)

    useEffect(() => {
        let cancelled = false

        const readMarker = () => {
            try {
                return window.localStorage.getItem(storageKey)
            } catch {
                return null
            }
        }
        const writeMarker = (iso: string | null) => {
            if (!iso) return
            try {
                window.localStorage.setItem(storageKey, iso)
            } catch {
                /* ignore quota / privacy-mode errors */
            }
        }

        const tick = async () => {
            if (cancelled || runningRef.current) return
            if (typeof document !== "undefined" && document.hidden) return
            runningRef.current = true
            try {
                const { getRecentNotifications } = await import("@/app/(protected)/notifications/actions")
                const { items } = await getRecentNotifications(15)
                if (cancelled) return

                const lastSeen = readMarker()
                const { fresh, newest } = selectNewNotifications(items as RecentNotification[], lastSeen)
                writeMarker(newest)

                if (!fresh.length) return

                const toastable = fresh.filter((n) => TOASTABLE_EVENT_TYPES.has(n.eventType))
                toastable.slice(-MAX_TOASTS_PER_TICK).forEach((n) => {
                    const fn = notificationTone(n.eventType) === "error" ? toast.error : toast.success
                    fn(n.title, { description: n.message })
                })

                // Refresh so the server-rendered unread badge reflects the new events.
                router.refresh()
            } catch {
                /* transient network / auth errors: try again next tick */
            } finally {
                runningRef.current = false
            }
        }

        // Seed the baseline immediately (no toast on first-ever run), then poll.
        void tick()
        const id = window.setInterval(tick, intervalMs)
        const onVisible = () => {
            if (!document.hidden) void tick()
        }
        document.addEventListener("visibilitychange", onVisible)

        return () => {
            cancelled = true
            window.clearInterval(id)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [storageKey, intervalMs, router])

    return null
}
