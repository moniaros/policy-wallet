/**
 * Compatibility shims over the notification bus.
 *
 * `sendNotification` and `notifyCounterparty` were two of the three ways this
 * codebase emitted a notification (the third being ~20 direct
 * `db.notificationEvent.create` calls). They are kept as thin wrappers so the
 * existing call sites keep working, but they no longer decide anything: both
 * delegate to `emit`, which reads the event's declaration from the registry.
 *
 * New code should call `emit` from `lib/notifications/dispatch` directly. The
 * `channels` argument here is now a NARROWING hint at most — an event's channel
 * set belongs to the event, not to whichever caller happens to be sending it,
 * which is precisely how renewal reminders came to be email-only and invisible
 * in the notification centre.
 */

import { emit, type LocalizedText, type RelatedObjectType } from "./notifications/dispatch"
import type { NotificationChannel } from "./notifications/registry"

export type { LocalizedText, RelatedObjectType }
export type { NotificationChannel }
export type NotificationStatus = "queued" | "sent" | "failed" | "skipped" | "expired"

interface SendNotificationParams {
    userId: string
    eventType: string
    title: LocalizedText
    message: LocalizedText
    /**
     * @deprecated The registry owns an event's channels. Passing this can only
     * narrow them, never widen them.
     */
    channels?: NotificationChannel[]
    relatedObjectType?: RelatedObjectType
    relatedObjectId?: string
    /** Idempotency key — see `emit`. */
    dedupeKey?: string
}

/** @deprecated Call `emit` from `lib/notifications/dispatch`. */
export async function sendNotification(params: SendNotificationParams) {
    return emit({
        event: params.eventType,
        userId: params.userId,
        title: params.title,
        message: params.message,
        relatedObjectType: params.relatedObjectType,
        relatedObjectId: params.relatedObjectId,
        dedupeKey: params.dedupeKey,
        // Historically every caller hardcoded ["email"], which is why a renewal
        // reminder never reached the bell. Ignored unless a caller genuinely
        // needs to restrict this one occurrence.
        only: undefined,
    })
}

export interface NotifyCounterpartyParams {
    userId: string
    eventType: string
    title: LocalizedText
    message: LocalizedText
    relatedObjectType?: RelatedObjectType
    relatedObjectId?: string
    // An `email?: boolean` flag used to live here. No caller ever passed it,
    // and under the bus it could only have lied — the registry decides an
    // event's channels. Removed rather than left as a switch that does nothing.
}

/**
 * Notify the counterparty of a cross-side collaboration action.
 *
 * @deprecated Call `emit` directly. Kept because seven call sites still use it.
 *
 * Never throws — `emit` already guarantees that, so the try/catch this used to
 * carry is gone rather than duplicated.
 */
export async function notifyCounterparty(params: NotifyCounterpartyParams): Promise<void> {
    await emit({
        event: params.eventType,
        userId: params.userId,
        title: params.title,
        message: params.message,
        relatedObjectType: params.relatedObjectType,
        relatedObjectId: params.relatedObjectId,
    })
}
