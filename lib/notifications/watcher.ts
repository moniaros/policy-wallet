/**
 * Pure helpers for the client-side NotificationWatcher poll — kept free of React
 * and server imports so the "new since last seen" logic is unit-testable.
 */

export interface RecentNotification {
    id: string
    eventType: string
    title: string
    message: string
    relatedObjectType: string | null
    relatedObjectId: string | null
    read: boolean
    createdAt: string // ISO 8601
}

/** Event types that surface as a live toast (analysis completion outcomes). */
export const TOASTABLE_EVENT_TYPES = new Set([
    "policy_analyzed",
    "policy_merged",
    "policy_analysis_failed",
])

export type ToastTone = "success" | "error"

export function notificationTone(eventType: string): ToastTone {
    return eventType === "policy_analysis_failed" ? "error" : "success"
}

/**
 * Given the latest notifications (server returns them newest-first) and the ISO
 * timestamp of the newest one we've already handled, return the strictly-newer
 * items oldest-first (so toasts fire in chronological order) plus the marker to
 * persist. On the first run (lastSeenIso null) nothing is "new" — we only seed
 * the marker so historical notifications never toast.
 */
export function selectNewNotifications(
    items: RecentNotification[],
    lastSeenIso: string | null
): { fresh: RecentNotification[]; newest: string | null } {
    const newest = items.length ? items[0].createdAt : lastSeenIso
    if (!lastSeenIso) return { fresh: [], newest }

    const fresh = items
        .filter((n) => n.createdAt > lastSeenIso)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return { fresh, newest }
}
