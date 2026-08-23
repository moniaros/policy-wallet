/**
 * One event, one entry — collapsing DELIVERY rows into the EVENTS they served.
 *
 * `notification_events` stores one row per channel per emission: the
 * dispatcher writes the caller's `dedupeKey` VERBATIM on every channel's row
 * (dispatch.ts:349 — `dedupeKey: params.dedupeKey ?? null`), and the
 * `@@unique([userId, dedupeKey, channel])` index is what lets the same key
 * exist once per channel. So within one user's rows, every delivery arm of a
 * single emission carries the IDENTICAL stored key. That key is the stable,
 * channel-independent event identity (D-002): grouping is an EXACT match on
 * it, per user — never a string operation on it.
 *
 * Why no suffix stripping, although D-002's prose mentions it: the suffix the
 * orchestrator appends (`${base}:${recipient.kind}`, orchestrator.ts:354) is
 * the recipient KIND (`owner` / `counterparty`) — recipients are different
 * users, so within one user's list the suffix is constant and harmless. There
 * is no per-channel suffix in the stored value to strip. Stripping the last
 * `:segment` anyway would corrupt direct-emit keys — it would merge
 * `renewal:<policyId>:30d` with `renewal:<policyId>:7d`, two different
 * reminders about the same policy.
 *
 * Rows WITHOUT a dedupe key (`null` — the shape of every row written before
 * the key existed, and of any emitter that passes none) render individually.
 * They are NEVER merged on a heuristic — not same-title, not same-minute, not
 * same-eventType (§12.2). Two unkeyed rows that look identical stay two
 * entries, because we cannot prove they are one event.
 *
 * Read state has ONE home: the event's in-app arm. The schema says `readAt`
 * is "meaningful on `in_app` rows only" — an email row's readAt would claim
 * we know the user opened an email, which we do not. So a grouped event is
 * unread exactly when it HAS an in-app arm and that arm is unread; an event
 * with no in-app arm (an email-only channel set) carries no read state and
 * must not render as unread — `markAllNotificationsRead` stamps in_app rows
 * only, so an "unread" email-only event would be a badge nothing can clear.
 * This is also what keeps read state from flickering: the bell, the watcher
 * and this grouping all read the SAME row's `readAt`.
 */

export interface DeliveryRowLike {
    id: string
    channel: string
    dedupeKey: string | null
    readAt: Date | null
    createdAt: Date
}

export interface NotificationEventGroup<T extends DeliveryRowLike> {
    /**
     * The row that speaks for the event: the in-app arm when the event has
     * one (it carries the read state, and its id is what mark-read targets),
     * otherwise the newest row in the group.
     */
    representative: T
    /** Every delivery row collapsed into this event, in input order. */
    rows: T[]
    /** Whether the event has an `in_app` delivery arm. */
    hasInAppArm: boolean
    /** The in-app arm's readAt. Null when unread — or when there is no in-app arm. */
    readAt: Date | null
    /** Unread ⇔ the event has an in-app arm AND that arm is unread. */
    unread: boolean
}

/**
 * Collapse one user's delivery rows (already ordered newest-first) into
 * events. Order is preserved: a group sits where its newest row sat.
 *
 * Pure and synchronous. Callers pass rows from a query already scoped to one
 * user — this function must never see two users' rows in one call, because a
 * dedupe key is only unique per user.
 */
export function groupNotificationEventRows<T extends DeliveryRowLike>(
    rows: readonly T[]
): NotificationEventGroup<T>[] {
    const groups: NotificationEventGroup<T>[] = []
    const byKey = new Map<string, NotificationEventGroup<T>>()

    for (const row of rows) {
        // Exact, non-empty key or nothing. An empty string is not an identity.
        const key = row.dedupeKey && row.dedupeKey.length > 0 ? row.dedupeKey : null

        const existing = key ? byKey.get(key) : undefined
        if (!existing) {
            const group: NotificationEventGroup<T> = {
                representative: row,
                rows: [row],
                hasInAppArm: row.channel === "in_app",
                readAt: row.channel === "in_app" ? row.readAt : null,
                unread: row.channel === "in_app" && row.readAt === null,
            }
            groups.push(group)
            if (key) byKey.set(key, group)
            continue
        }

        existing.rows.push(row)
        if (row.channel === "in_app" && !existing.hasInAppArm) {
            // The in-app arm wins the representative slot: its id is the one
            // mark-read acts on, and its readAt is the event's read state.
            existing.representative = row
            existing.hasInAppArm = true
            existing.readAt = row.readAt
            existing.unread = row.readAt === null
        }
    }

    return groups
}
