import { emit } from "@/lib/notifications/dispatch"
import { getEventDefinition } from "@/lib/notifications/registry"
import { logger } from "@/lib/logger"

/**
 * Server-side conversion-event mirror. GA/Vercel Analytics only see what the
 * browser sends; these rows make the admin funnel measurable without any client
 * analytics. Never throws: analytics must not break a money path.
 *
 * These share the notification table (the "zero-migration store" the feedback
 * route also uses) but they are NOT notifications, and they used to be written
 * as though they were: `channel: 'in_app'`, `title: 'conv_checkout_completed'`,
 * a JSON blob as the body. So the notification centre rendered a machine code
 * to the customer as a notification, and the unread badge counted it — 12 of
 * one production account's 141 phantom unread items.
 *
 * They now go out on the `analytics` channel, which every notification surface
 * filters out. Same table, same zero migrations, no lie.
 */

export type ConversionEventType =
    | "checkout_started"
    | "checkout_completed"
    | "checkout_cancelled"
    | "limit_hit"
    // Paid Aha Loop v1 — server-side AI-call funnel (client can't see these).
    | "free_ai_call_blocked"
    | "paid_ai_call_started"
    | "paid_ai_call_completed"
    // Agent B2B — a client accepted an agent's proposal (a closed sale).
    | "proposal_accepted"

export interface ConversionEventDetails {
    /** Trigger surface, e.g. "upgrade_modal", "carried_plan", "token_topup". */
    source?: string
    plan?: string
    billingPeriod?: string
    /** For limit_hit / *_ai_call_*: which operation, e.g. "gap_analysis", "ai_question". */
    kind?: string
    /** Feature the checkout started from / the user attempted (FEATURE_GATES key). */
    feature?: string
    tokens?: number
    /** For report_unlock: which policy's report was purchased. */
    policyId?: string
}

export async function recordConversionEvent(
    userId: string,
    type: ConversionEventType,
    details: ConversionEventDetails = {}
) {
    const event = `conv_${type}`
    try {
        const def = getEventDefinition(event)
        // The registry's businessEvent is a readable sentence, so even the
        // analytics rows stop being machine codes in the admin funnel view.
        // Same text in both arms: these rows live on the `analytics` channel,
        // which every customer notification surface filters out — the only
        // reader is the admin funnel, and there is nothing to translate about
        // a machine mirror.
        const readable = def?.businessEvent ?? event
        const payload = JSON.stringify(details)
        await emit({
            event,
            userId,
            title: { el: readable, en: readable },
            message: { el: payload, en: payload },
            // relatedObject* is deliberately NOT set from `details.source`.
            // `relatedObjectType` is a closed vocabulary the UI switches on to
            // build a deep link, and stuffing "upgrade_modal" into it produced
            // rows whose type no link builder could recognise.
        })
    } catch (error) {
        logger("warn", "Failed to record conversion event", {
            userId,
            type,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}
