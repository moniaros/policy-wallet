/**
 * The bell badge counts unread items in «Για την προστασία σας» ONLY (§9).
 * System telemetry («Τι έκανα εν τω μεταξύ») never counts.
 */
import { streamOf, type NotificationStream } from "./streams"

export interface BadgeItem {
    eventType: string
    channel: string
    readAt: Date | string | null
}

export function badgeCount(items: readonly BadgeItem[]): number {
    let n = 0
    for (const i of items) {
        if (i.channel !== "in_app") continue
        if (i.readAt) continue
        if (streamOf(i.eventType) === "protection") n += 1
    }
    return n
}

export function isBadgeStream(stream: NotificationStream): boolean {
    return stream === "protection"
}
